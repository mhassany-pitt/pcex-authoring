import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { v4 as uuid4 } from 'uuid';
import { ActivitiesService } from '../activities-service/activities.service';
import { CompilerService } from '../compiler-service/compiler.service';

@Controller('activities')
export class ActivitiesController {

  constructor(
    private api: ActivitiesService,
    private transform: CompilerService,
  ) { }

  @Get()
  index() {
    return this.api.list().map((id: any) => {
      const activity = this.api.read(id);
      return { id, name: activity.name, stat: this.transform.stat(id) };
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
}
