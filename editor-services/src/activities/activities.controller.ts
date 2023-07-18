import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ActivitiesService } from '../activities-service/activities.service';
import { CompilerService } from '../compiler-service/compiler.service';
import { createReadStream } from 'fs-extra';
import { Request, Response } from 'express';
import { toObject, useId } from 'src/utils';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { SourcesService } from 'src/sources-service/sources.service';

@Controller('activities')
export class ActivitiesController {

  constructor(
    private activities: ActivitiesService,
    private sources: SourcesService,
    private compiler: CompilerService,
  ) { }

  private getUserEmail(req: any) { return req.user.email; }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request) {
    return (await this.activities.list({ user: this.getUserEmail(req) })).map(activity => {
      const { _id: id, published, name, items } = activity;
      return {
        id, published, name, items,
        stat: this.compiler.getSizeLastModified(id)
      };
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: Request, @Body() activity: any) {
    activity = toObject(await this.activities.create({ ...activity, user: this.getUserEmail(req) }));
    return { id: activity._id };
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    return useId(activity);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    await this.activities.update({ ...updates, user: this.getUserEmail(req), _id: id });
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    await this.activities.remove({ user: this.getUserEmail(req), id });
  }

  private async authorizePreview(req: Request, id: string, type: string) {
    let found = null, payload = { user: this.getUserEmail(req), id };
    /**/ if (type === 'source') found = await this.sources.read(payload);
    else if (type === 'activity') found = await this.activities.read(payload);
    if (!found) throw new NotFoundException();
  }

  @Patch(':id/preview')
  @UseGuards(AuthenticatedGuard)
  async genPreview(@Req() req: Request, @Param('id') id: string, @Body() activity: any, @Query('type') type: string) {
    await this.authorizePreview(req, id, type);

    await this.compiler.compile({ ...activity, id });
  }

  @Get(':id/preview')
  @UseGuards(AuthenticatedGuard)
  async getPreview(@Req() req: Request, @Param('id') id: string, @Res({ passthrough: true }) res: Response, @Query('type') type: string) {
    await this.authorizePreview(req, id, type);

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
}
