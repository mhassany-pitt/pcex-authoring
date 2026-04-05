import {
  Body, Controller, ForbiddenException, Get, NotFoundException, Param,
  Patch, Post, Query, Req, Res, StreamableFile, UseGuards
} from '@nestjs/common';
import { ActivitiesService } from '../activities-service/activities.service';
import { CompilerService } from '../compiler-service/compiler.service';
import { createReadStream } from 'fs-extra';
import { Request, Response } from 'express';
import { toObject, useId } from 'src/utils';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { SourcesService } from 'src/sources-service/sources.service';
import { Worker } from 'worker_threads';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { syncToPAWS } from './paws-sync';
import { UsersService } from 'src/users/users.service';

@Controller('activities')
export class ActivitiesController {

  constructor(
    private config: ConfigService,
    private sources: SourcesService,
    private activities: ActivitiesService,
    private compiler: CompilerService,
    private users: UsersService,
    @InjectDataSource('aggregate') private ds_agg: DataSource,
    @InjectDataSource('um2') private ds_um2: DataSource,
  ) { }

  private getUserEmail(req: any) { return req.user.email; }
  private isAppAdmin(req: any) { return req.user.roles?.includes('app-admin'); }

  private attachStat(activity: any) {
    activity.stat = this.compiler.getSizeLastModified(activity.id);
    return activity;
  }

  private getDetailedErrorLog(error: any) {
    if (!error) return 'Unknown error';

    const source = (error.response || error.config || error.isAxiosError)
      ? error
      : (error.cause || error);
    const responseData = typeof source.response?.data == 'object'
      ? JSON.stringify(source.response.data, null, 2)
      : source.response?.data;
    const requestData = typeof source.config?.data == 'object'
      ? JSON.stringify(source.config.data, null, 2)
      : source.config?.data;
    const stack = typeof error.stack == 'string'
      ? error.stack
          .replace(new RegExp(`^${error.name || 'Error'}: ${this.escapeRegex(error.message || '')}\\n?`), '')
          .trim()
      : error.stack;
    const details = [
      error.name ? `name: ${error.name}` : null,
      (source.code || error.code) ? `code: ${source.code || error.code}` : null,
      error.errno ? `errno: ${error.errno}` : null,
    ].filter(Boolean).join('\n');
    const axiosDetails = [
      source.isAxiosError ? 'axios: true' : null,
      source.config?.method ? `method: ${String(source.config.method).toUpperCase()}` : null,
      source.config?.baseURL ? `baseURL: ${source.config.baseURL}` : null,
      source.config?.url ? `url: ${source.config.url}` : null,
      source.response?.status ? `status: ${source.response.status}` : null,
      source.response?.statusText ? `statusText: ${source.response.statusText}` : null,
    ].filter(Boolean).join('\n');
    const message = source.isAxiosError ? error.message : error.message;
    const sections = [
      details,
      axiosDetails,
      message,
      requestData ? `request data:\n${requestData}` : null,
      responseData ? `response data:\n${responseData}` : null,
      stack,
    ].filter(Boolean);

    return sections.filter((section, index) => sections.indexOf(section) == index).join('\n\n');
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request, @Query('include') include: string, @Query('allUsers') allUsers: string) {
    return (await this.activities.list({
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      archived: include == 'archived'
    })).map(activity => {
      const { _id: id, published, archived, 
        name, items, linkings, user, iso_language_code, translations,
        collaborator_emails, created_at, updated_at } = activity;
      return this.attachStat({ 
        id, published, archived, name, items, iso_language_code, translations,
        linkings: Object.keys(linkings || {}).length > 0, 
        user, collaborator_emails, 
        created_at, updated_at 
      });
    }).sort((a, b) => b.id.toString().localeCompare(a.id.toString()));
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: Request, @Body() activity: any) {
    activity = toObject(await this.activities.create({ ...activity, user: this.getUserEmail(req) }));
    return this.attachStat({ id: activity._id });
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Req() req: Request, @Param('id') id: string, @Query('allUsers') allUsers: string) {
    const activity = await this.activities.read({
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      id
    });
    if (!activity) throw new NotFoundException();
    const { linkings, ...rest } = activity;
    return this.attachStat(useId(rest));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    updates.collaborator_emails = updates.collaborator_emails?.map((c: string) => c.trim().toLowerCase()).filter((c: string) => c);

    const resp = {};
    try {
      await syncToPAWS({
        ds_agg: this.ds_agg,
        ds_um2: this.ds_um2,
        config: this.config,
        activities: this.activities,
        sources: this.sources,
        request: req,
        users: this.users,
        activity: updates,
        isadmin: false,
      });
    } catch (error) {
      console.error('PAWS sync error:', error);
      resp['paws_sync_error'] = 'Failed to sync with PAWS Catalog.';
      if (this.isAppAdmin(req)) {
        resp['paws_sync_error_log'] = this.getDetailedErrorLog(error);
      }
    }

    await this.activities.update({ ...updates, user: this.getUserEmail(req), _id: id });

    if (updates.translations) {
      const allIds = new Set<string>([id, ...Object.values(updates.translations) as string[]]);
      const allActivities = await Promise.all([...allIds].map(sid => this.activities.db().findById(sid)));
      const maps = allActivities.filter(Boolean).map(a => ({
        id: a._id.toString(),
        iso: a.iso_language_code,
        translations: a.translations || {}
      }));

      const combinedMap: Record<string, string> = {};
      maps.forEach(m => {
        if (m.iso) combinedMap[m.iso] = m.id;
        Object.entries(m.translations).forEach(([iso, sid]) => {
          if (sid) combinedMap[iso] = sid as string;
        });
      });

      for (const m of maps) {
        const translations = { ...combinedMap };
        if (m.iso) delete translations[m.iso];
        await this.activities.db().updateOne({ _id: m.id }, { $set: { translations } });
      }
    }

    return resp;
  }

  // @Delete(':id')
  // @UseGuards(AuthenticatedGuard)
  // async remove(@Req() req: Request, @Param('id') id: string) {
  //   const activity = await this.activities.read({ user: this.getUserEmail(req), id });
  //   if (!activity) throw new NotFoundException();

  //   await this.activities.remove({ user: this.getUserEmail(req), id });
  // }

  // private async authorizePreview(req: Request, id: string, type: string) {
  // TODO: should we authorize?!
  // let found = null, payload = { user: this.getUserEmail(req), id };
  // /**/ if (type === 'source') found = await this.sources.read(payload);
  // else if (type === 'activity') found = await this.activities.read(payload);
  // if (!found) throw new NotFoundException();
  // }

  @Patch(':id/preview')
  @UseGuards(AuthenticatedGuard)
  async genPreview(@Req() req: Request, @Res() res: Response, @Param('id') id: string, @Body() activity: any) {
    // await this.authorizePreview(req, id, type);
    // await this.compiler.compile({ ...activity, id });
    const worker = new Worker(`${__dirname}/compile.js`, {
      workerData: { ...activity, id },
    });
    worker.on('message', (result) => {
      console.log(result);
      const resp: any = {};
      if (this.isAppAdmin(req)) {
        resp.preview_log = typeof result == 'string'
          ? result
          : result
            ? JSON.stringify(result, null, 2)
            : `Generated preview JSON for "${activity.name || id}".`;
      }
      res.json(resp);
    });
    worker.on('error', (error) => {
      console.error(error);
      const resp: any = { error: 'Failed to generate preview JSON.' };
      if (this.isAppAdmin(req)) {
        resp.error_log = this.getDetailedErrorLog(error);
      }
      res.status(500).json(resp);
    });
  }

  @Post(':id/sync')
  @UseGuards(AuthenticatedGuard)
  async sync(@Req() req: Request, @Param('id') id: string, @Query('allUsers') allUsers: string) {
    const activity = useId(await this.activities.read({
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      id
    }));
    if (!activity) throw new NotFoundException();

    const resp = {};
    try {
      await syncToPAWS({
        ds_agg: this.ds_agg,
        ds_um2: this.ds_um2,
        config: this.config,
        activities: this.activities,
        sources: this.sources,
        request: req,
        users: this.users,
        activity,
        isadmin: true,
      });
    } catch (error) {
      console.error('PAWS sync error:', error);
      resp['paws_sync_error'] = 'Failed to sync with PAWS Catalog.';
      if (this.isAppAdmin(req)) {
        resp['paws_sync_error_log'] = this.getDetailedErrorLog(error);
      }
    }

    await this.activities.update({
      ...activity,
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      id: activity.id
    });

    if (this.isAppAdmin(req) && !resp['paws_sync_error']) {
      resp['paws_sync_log'] = `Synced "${activity.name || activity.id}" to PAWS.`;
    }

    return resp;
  }

  @Get(':id/preview')
  // @UseGuards(AuthenticatedGuard)
  async getPreview(@Req() req: Request, @Param('id') id: string, @Res({ passthrough: true }) res: Response, @Query('type') type: string) {
    // await this.authorizePreview(req, id, type);
    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', `attachment; filename="preview.json"`);
    return new StreamableFile(createReadStream(this.compiler.preview(id)));
  }

  @Get(':id/download')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: Request, @Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    res.header('Content-Type', 'application/zip');
    const filename = activity.length ? activity[0].activityName : `Activity-${id}`;
    res.header('Content-Disposition', `attachment; filename="${filename}.zip"`);

    return new StreamableFile(createReadStream(await this.compiler.archive(id)));
  }

  @Post(':id/clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    const { _id, linkings, ...attrs } = activity;
    attrs.name += ' (clone)';
    const clone = toObject(await this.activities.create({ ...attrs }));
    return { id: clone._id };
  }
}
