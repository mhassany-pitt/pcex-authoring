import {
  Body, Controller, Delete, Get, NotFoundException, Param,
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

@Controller('activities')
export class ActivitiesController {

  constructor(
    private config: ConfigService,
    private sources: SourcesService,
    private activities: ActivitiesService,
    private compiler: CompilerService,
    private ds: DataSource,
  ) { }

  private getUserEmail(req: any) { return req.user.email; }

  private attachStat(activity: any) {
    activity.stat = this.compiler.getSizeLastModified(activity.id);
    return activity;
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request, @Query('include') include: string) {
    return (await this.activities.list({ user: this.getUserEmail(req), archived: include == 'archived' })).map(activity => {
      const { _id: id, published, archived, name, items, linkings } = activity;
      return this.attachStat({ id, published, archived, name, items });
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: Request, @Body() activity: any) {
    activity = toObject(await this.activities.create({ ...activity, user: this.getUserEmail(req) }));
    return this.attachStat({ id: activity._id });
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();
    const { linkings, ...rest } = activity;
    return this.attachStat(useId(rest));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    await this.syncToAggregate(req, updates);
    await this.activities.update({ ...updates, user: this.getUserEmail(req), _id: id });
  }

  private async syncToAggregate(req: any, activity: any) {
    this.ds.transaction(async (manager) => {
      const MAPPING_ID = `[AUTO-GENERATED:DONT-CHANGE-THIS:PCEX_AUTHORING_MAPPED_ID=${activity.id}]`;

      const [prevMapping] = await manager.query(
        'SELECT content_id FROM ent_content WHERE provider_id = ? AND comment = ?',
        ['pcex_activity', MAPPING_ID]
      );

      if (prevMapping)
        await manager.query("DELETE FROM ent_content WHERE content_id = ?", [prevMapping.content_id]);

      let language = (activity.items?.length
        ? (await this.sources.read({ user: this.getUserEmail(req), id: activity.items[0].item })).language
        : 'undefined').toLowerCase();
      if (language == 'python') language = 'py';

      if (activity.published) {
        manager.query("INSERT INTO ent_content " +
          "(content_id, content_name, content_type, display_name, `desc`, url, `domain`, " +
          " provider_id, comment, visible, creation_date, creator_id, privacy, author_name) " +
          "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            prevMapping?.content_id, `${activity.name}_${Date.now()}`, 'pcex_activity', activity.name, activity.description,
            `${this.config.get('PREVIEW_ACTIVITY_URL')}/${activity.id}?_t=${Date.now()}`,
            language, 'pcex_activity', MAPPING_ID, 1, new Date(), req.user.email, 'public',
            req.user.fullname
          ])
      }
    });
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    await this.activities.remove({ user: this.getUserEmail(req), id });
  }

  // private async authorizePreview(req: Request, id: string, type: string) {
  // TODO: should we authorize?!
  // let found = null, payload = { user: this.getUserEmail(req), id };
  // /**/ if (type === 'source') found = await this.sources.read(payload);
  // else if (type === 'activity') found = await this.activities.read(payload);
  // if (!found) throw new NotFoundException();
  // }

  @Patch(':id/preview')
  @UseGuards(AuthenticatedGuard)
  async genPreview(@Res() res: Response, @Param('id') id: string, @Body() activity: any) {
    // await this.authorizePreview(req, id, type);
    // await this.compiler.compile({ ...activity, id });
    const worker = new Worker(`${__dirname}/compile.js`, { workerData: { ...activity, id } });
    worker.on('message', (result) => {
      console.log(result);
      res.json({});
    });
    worker.on('error', (error) => {
      console.error(error);
      res.status(500).json({});
    });
  }

  @Get(':id/preview')
  @UseGuards(AuthenticatedGuard)
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

    const { _id, ...attrs } = activity;
    attrs.name += ' (clone)';
    const clone = toObject(await this.activities.create({ ...attrs }));
    return { id: clone._id };
  }
}
