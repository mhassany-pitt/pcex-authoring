import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res, StreamableFile } from '@nestjs/common';
import { v4 as uuid4 } from 'uuid';
import { ActivitiesService } from '../activities-service/activities.service';
import { CompilerService } from '../compiler-service/compiler.service';
import { createReadStream } from 'fs-extra';
import { Response } from 'express';

@Controller('activities')
export class ActivitiesController {

  constructor(
    private api: ActivitiesService,
    private compiler: CompilerService,
  ) { }

  @Get()
  index() {
    return this.api.list().map((id: any) => {
      const activity = this.api.read(id);
      return { id, name: activity.name, stat: this.compiler.stat(id) };
    });
  }

  @Post()
  create(@Body() attrs: any) {
    const activity = { ...attrs, id: uuid4() };
    this.api.store(activity.id, activity);
    return activity;
  }

  @Get(':id')
  get(@Param('id') id: string) {
    if (!this.api.exists(id))
      throw new NotFoundException();

    return this.api.read(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() updates: any) {
    if (!this.api.exists(id))
      throw new NotFoundException();

    this.api.store(id, {
      ... this.api.read(id),
      ...updates
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!this.api.exists(id))
      throw new NotFoundException();

    this.api.remove(id);
  }

  @Patch(':id/preview')
  genPreview(@Param('id') id: string, @Body() activity: any) {
    this.compiler.compile$(activity, { json: true, queries: false });
  }

  @Get(':id/preview')
  getPreview(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const file = createReadStream(this.compiler.preview(id));
    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', `attachment; filename="preview.json"`);

    return new StreamableFile(file);
  }
}
