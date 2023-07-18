import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res, StreamableFile } from '@nestjs/common';
import { ActivitiesService } from '../activities-service/activities.service';
import { CompilerService } from '../compiler-service/compiler.service';
import { createReadStream } from 'fs-extra';
import { Response } from 'express';
import { toObject, useId } from 'src/utils';

@Controller('activities')
export class ActivitiesController {

  constructor(
    private api: ActivitiesService,
    private compiler: CompilerService,
  ) { }

  @Get()
  async index() {
    return (await this.api.list()).map(activity => {
      const { _id: id, name, items } = activity;
      return { id, name, items, stat: this.compiler.getSizeLastModified(id) };
    });
  }

  @Post()
  async create(@Body() activity: any) {
    activity = toObject(await this.api.create(activity));
    return { id: activity._id };
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    const activity = await this.api.read(id);
    if (!activity) throw new NotFoundException();

    return useId(activity);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() updates: any) {
    const activity = await this.api.read(id);
    if (!activity) throw new NotFoundException();

    await this.api.update({ ...updates, _id: id });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const activity = await this.api.read(id);
    if (!activity) throw new NotFoundException();

    await this.api.remove(id);
  }

  @Patch(':id/preview')
  async genPreview(@Param('id') id: string, @Body() activity: any) {
    await this.compiler.compileActivity(activity, { json: true, queries: false });
  }

  @Get(':id/preview')
  async getPreview(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', `attachment; filename="preview.json"`);
    return new StreamableFile(createReadStream(this.compiler.preview(id)));
  }
}
