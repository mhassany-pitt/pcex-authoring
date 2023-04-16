import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { SourcesService } from '../sources-service/sources.service';
import { v4 as uuid4 } from 'uuid';

@Controller('sources')
export class SourcesController {

  constructor(
    private api: SourcesService,
  ) { }

  @Get()
  index() {
    return this.api.list().map((id: any) => {
      const source = this.api.read(id);
      return {
        id,
        name: source.name,
        description: source.description
      };
    });
  }

  @Post()
  create() {
    const source = { id: uuid4() };
    this.api.write(source.id, source);
    return source;
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

    this.api.write(id, {
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
