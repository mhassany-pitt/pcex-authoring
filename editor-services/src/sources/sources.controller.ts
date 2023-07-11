import {
  Body, Controller, Delete, Get,
  NotFoundException, Param, Patch, Post, UseGuards
} from '@nestjs/common';
import { SourcesService } from '../sources-service/sources.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';

@Controller('sources')
export class SourcesController {

  constructor(
    private api: SourcesService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index() {
    return (await this.api.list()).map(source => {
      const { _id: id, name, description } = source;
      return { id, name, description };
    });
  }

  @Post()
  async create() {
    const source = toObject(await this.api.create({}));
    return { id: source._id };
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    const source = await this.api.read(id);
    if (!source) throw new NotFoundException();

    return useId(source);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() updates: any) {
    const source = await this.api.read(id);
    if (!source) throw new NotFoundException();

    await this.api.update({ ...updates, _id: id });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const source = await this.api.read(id);
    if (!source) throw new NotFoundException();

    await this.api.remove(id);
  }
}
