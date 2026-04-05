import {
  Body, Controller, Get, NotFoundException,
  Param, Patch, Post, Query, Req, UseGuards
} from '@nestjs/common';
import { SourcesService } from '../sources-service/sources.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';
import { Request } from 'express';

@Controller('sources')
export class SourcesController {

  constructor(
    private sources: SourcesService,
  ) { }

  private getUserEmail(req: any) { return req.user.email; }
  private isAppAdmin(req: any) { return req.user.roles?.includes('app-admin'); }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request, @Query('include') include: string, @Query('allUsers') allUsers: string) {
    return (await this.sources.list({
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      archived: include == 'archived'
    })).map(source => {
      const { _id: id, archived, name, description, tags, 
        iso_language_code, language, user, collaborator_emails, 
        translations, created_at, updated_at } = source;
      return { id, archived, name, description, tags, 
        iso_language_code, language, user, collaborator_emails, 
        translations, created_at, updated_at };
    }).sort((a, b) => b.id.toString().localeCompare(a.id.toString()));
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: Request) {
    const user = this.getUserEmail(req);
    const source = toObject(await this.sources.create({ user }));
    await this.sources.log({ id: source._id, log: { type: 'create', user } });
    return { id: source._id };
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Req() req: Request, @Param('id') id: string, @Query('allUsers') allUsers: string) {
    const source = await this.sources.read({
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      id
    });
    if (!source) throw new NotFoundException();
    return useId(source);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any, @Query('allUsers') allUsers: string) {
    const isAdmin = allUsers == 'true' && this.isAppAdmin(req);
    const source = await this.sources.read({
      isadmin: isAdmin,
      user: this.getUserEmail(req),
      id
    });
    if (!source) throw new NotFoundException();

    updates.tags = updates.tags?.map((t: string) => t.trim()).filter((t: string) => t);
    updates.collaborator_emails = updates.collaborator_emails?.map((c: string) => c.trim().toLowerCase()).filter((c: string) => c);

    await this.sources.update({
      ...updates,
      isadmin: isAdmin,
      user: this.getUserEmail(req),
      _id: id
    });

    if (updates.translations) {
      const allIds = new Set<string>([id, ...Object.values(updates.translations) as string[]]);
      const allSources = await Promise.all([...allIds].map(sid => this.sources.db().findById(sid)));
      const maps = allSources.filter(Boolean).map(s => ({
        id: s._id.toString(),
        iso: s.iso_language_code,
        translations: s.translations || {}
      }));

      // Merge all translation maps
      const combinedMap: Record<string, string> = {};
      maps.forEach(m => {
        if (m.iso) combinedMap[m.iso] = m.id;
        Object.entries(m.translations).forEach(([iso, sid]) => {
          if (sid) combinedMap[iso] = sid as string;
        });
      });

      // Update each source with the combined map (minus itself)
      for (const m of maps) {
        const translations = { ...combinedMap };
        if (m.iso) delete translations[m.iso];
        await this.sources.db().updateOne({ _id: m.id }, { $set: { translations } });
      }
    }
  }

  // @Delete(':id')
  // @UseGuards(AuthenticatedGuard)
  // async remove(@Req() req: Request, @Param('id') id: string) {
  //   const source = await this.sources.read({ user: this.getUserEmail(req), id });
  //   if (!source) throw new NotFoundException();

  //   await this.sources.remove({ user: this.getUserEmail(req), id });
  // }

  @Post(':id/log')
  @UseGuards(AuthenticatedGuard)
  async log(@Req() req: Request, @Param('id') id: string, @Body() log: any) {
    await this.sources.log({ id, log });
  }

  @Post(':id/clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Req() req: Request, @Param('id') id: string, @Query('allUsers') allUsers: string) {
    const source = await this.sources.read({
      isadmin: allUsers == 'true' && this.isAppAdmin(req),
      user: this.getUserEmail(req),
      id
    });
    if (!source) throw new NotFoundException();

    const { _id, ...attrs } = source;
    attrs.name += ' (clone)';
    const clone = toObject(await this.sources.create({ ...attrs }));
    return { id: clone._id };
  }
}
