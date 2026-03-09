import {
  Body,
  Controller,
  HttpException,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { ActivitiesService } from 'src/activities-service/activities.service';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { SourcesService } from 'src/sources-service/sources.service';
import { toObject, useId } from 'src/utils';

@Controller('bulk')
export class BulkController {
  constructor(
    private config: ConfigService,
    private sources: SourcesService,
    private activities: ActivitiesService,
    private compiler: CompilerService,
  ) {}

  private async validate(req: any) {
    const content = await readFile(
      `${this.config.get('STORAGE_PATH')}/authorized-api-tokens.txt`,
      'utf-8',
    );
    const tokens = content
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t);
    return tokens.includes(req.headers['api-token']);
  }

  @Post('sources')
  async createSource(@Request() req: any, @Body() body: any) {
    if (!(await this.validate(req)))
      throw new HttpException('Unauthorized', 401);
    const resp = await this.sources.create(body);
    return this.compileSource(toObject(resp)._id, body.user);
  }

  @Patch('sources/:id')
  async updateSource(
    @Request() req: any,
    @Body() body: any,
    @Param('id') id: string,
  ) {
    if (!(await this.validate(req)))
      throw new HttpException('Unauthorized', 401);
    const source = await this.sources.read({ id, user: body.user });
    if (!source) throw new HttpException('Source not found', 404);
    await this.sources.update({ ...body, _id: id });
    return this.compileSource(id, body.user);
  }

  private async compileSource(id: string, user: string) {
    console.log(`Compiling source ${id} for user ${user}`);
    const source = useId(await this.sources.read({ id, user }));
    console.log(source);
    const items = [
      { item$: { ...source, id: `${id}_example` }, type: 'example' },
    ];

    const hasBlankline = Object.keys(source.lines || {}).filter(
      (ln) => source.lines[ln].blank,
    );
    if (hasBlankline)
      items.push({
        item$: { ...source, id: `${id}_challenge` },
        type: 'challenge',
      });

    this.compiler.compile({ id, name: source.name, items });
    return { id };
  }

  @Post('activities')
  async createActivity(@Request() req: any, @Body() body: any) {
    if (!(await this.validate(req)))
      throw new HttpException('Unauthorized', 401);
    const resp = await this.activities.create(body);
    return this.compileActivity(toObject(resp)._id, body.user);
  }

  @Patch('activities/:id')
  async updateActivity(
    @Request() req: any,
    @Body() body: any,
    @Param('id') id: string,
  ) {
    if (!(await this.validate(req)))
      throw new HttpException('Unauthorized', 401);
    const activity = await this.activities.read({ id, user: body.user });
    if (!activity) throw new HttpException('Activity not found', 404);
    await this.activities.update({ ...body, id });
    return this.compileActivity(id, body.user);
  }

  private async compileActivity(id: string, user: string) {
    const activity = useId(await this.activities.read({ id, user }));
    await this.compiler.compile(activity);
    return { id };
  }
}
