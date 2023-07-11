import {
  Controller, Get, Header, NotFoundException,
  Param, Patch, Res, StreamableFile
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs-extra';
import { ActivitiesService } from 'src/activities-service/activities.service';
import { CompilerService } from 'src/compiler-service/compiler.service';

@Controller('compiler')
export class CompilerController {

  constructor(
    private api: CompilerService,
    private activities: ActivitiesService,
  ) { }

  @Patch(':id')
  async create(@Param('id') id: string) {
    const activity = await this.activities.read(id);
    if (!activity) throw new NotFoundException();

    this.api.compile(id);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const activity = await this.activities.read(id);
    if (!activity) throw new NotFoundException();

    const filename = activity.length ? activity[0].activityName : `Activity-${id}`;

    const file = createReadStream(await this.api.archive(id));
    res.header('Content-Type', 'application/zip');
    res.header('Content-Disposition', `attachment; filename="${filename}.zip"`);

    return new StreamableFile(file);
  }
}
