import {
  Controller, Get, NotFoundException,
  Param, Query, Res, StreamableFile
} from '@nestjs/common';
import { HubService } from './hub.service';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { useId } from 'src/utils';

@Controller('hub')
export class HubController {

  constructor(
    private service: HubService,
    private compiler: CompilerService,
  ) { }

  @Get()
  async index(@Query('key') key: string) {
    return (await this.service.list({ key })).map(activity => {
      const { id, name, items } = useId(activity);
      return { id, name, items };
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const activity = await this.service.get(id);
    if (!activity || !activity.published)
      throw new NotFoundException();

    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', `attachment; filename="preview.json"`);
    return new StreamableFile(createReadStream(this.compiler.preview(id)));
  }
}
