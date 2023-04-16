import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res, StreamableFile } from '@nestjs/common';
import { SourcesService } from '../sources-service/sources.service';
import { v4 as uuid4 } from 'uuid';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { createReadStream } from 'fs-extra';
import { Response } from 'express';

@Controller('sources')
export class SourcesController {

  constructor(
    private api: SourcesService,
    private compiler: CompilerService,
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

  @Patch(':id/preview')
  genPreview(@Param('id') id: string, @Body() source: any) {
    if (!this.api.exists(id))
      throw new NotFoundException();

    this.compiler.compile$({
      "id": source.id,
      "name": source.name,
      "items": [{ "item$": source, "type": "example" }],
    }, { json: true, queries: false });
  }

  @Get(':id/preview')
  getPreview(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    if (!this.api.exists(id))
      throw new NotFoundException();

    const file = createReadStream(this.compiler.preview(id));
    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', `attachment; filename="preview.json"`);

    return new StreamableFile(file);
  }
}
