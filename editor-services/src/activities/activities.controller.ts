import {
  Body, Controller, Delete, Get, NotFoundException, Param,
  Patch, Post, Query, Req, Res, StreamableFile, UseGuards
} from '@nestjs/common';
import { ActivitiesService } from '../activities-service/activities.service';
import { CompilerService } from '../compiler-service/compiler.service';
import { createReadStream, exists } from 'fs-extra';
import { Request, Response } from 'express';
import { toObject, useId } from 'src/utils';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { SourcesService } from 'src/sources-service/sources.service';
import { Worker } from 'worker_threads';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { syncToPAWS } from './paws-sync';
// import { appendFile, readFile } from 'fs/promises';

// const activities2clone = [
//   "arithmetic.bmi_calculator",
//   "arithmetic.f_to_c_conversion",
//   "arithmetic.pythagorean_theorem",
//   "arithmetic.time_conversion",
//   "arraylist.vocabulary",
//   "arrays.j_array_basic",
//   "arrays.j_array_change",
//   "arrays.j_array_fill",
//   "arrays.j_array_min_max",
//   "arrays.j_array_process_elements",
//   "arrays.j_array_rotate",
//   "arrays.j_search_array",
//   "arrays.j_temperature",
//   "arrays2d.j_array2d_basic",
//   "arrays2d.j_print_medals",
//   "arrays2d.j_soda_survery",
//   "artihmetic.vending_machine",
//   "artithmetic.inc_dec_operators",
//   "booleans.fail_course",
//   "booleans.hot_dry",
//   "booleans.phone_age",
//   "booleans.rent_car",
//   "booleans.three_booleans",
//   "exceptions.j_check_age",
//   "exceptions.j_check_producut_code",
//   "files.j_input_stat",
//   "files.j_work_hours",
//   "for_loops.j_for_one",
//   "for_loops.j_for_three",
//   "for_loops.j_for_two",
//   "for_loops.j_squares",
//   "ifelse.if_else_if_grade",
//   "ifelse.if_else_num",
//   "ifelse.if_else_wage",
//   "ifelse.nested_if_min_max",
//   "ifelse.nested_if_temperature",
//   "inheritance.animals",
//   "inheritance.point",
//   "nested_for.repeated_sequence",
//   "nested_for.star_patterns",
//   "objects.classes.account",
//   "objects.classes.loan",
//   "objects.classes.point",
//   "objects.classes.tv",
//   "strings.addition",
//   "strings.charAt",
//   "strings.equals",
//   "strings.escape_chars",
//   "strings.substring",
//   "while_loops.divisor",
//   "while_loops.inputs",
//   "while_loops.j_average",
//   "while_loops.j_check_adjacent",
//   "while_loops.j_digits",
//   "while_loops.win_percentage",
// ];

@Controller('activities')
export class ActivitiesController {

  constructor(
    private config: ConfigService,
    private sources: SourcesService,
    private activities: ActivitiesService,
    private compiler: CompilerService,
    @InjectDataSource('aggregate') private ds_agg: DataSource,
    @InjectDataSource('um2') private ds_um2: DataSource,
  ) {
    // setTimeout(() => this.tmpCloneStudySources(), 0);
  }

  // private async attachLanguages() {
  //   for (let activity of (await this.activities.backup()).map(useId)) {
  //     let count = 0;
  //     for (let source of activity.items) {
  //       if (!source.details.language || !source.details.tags) {
  //         const $source = useId(await this.sources.read({ id: source.item, user: activity.user }));
  //         source.details.language = $source.language;
  //         source.details.tags = $source.tags;
  //         console.log(`added missing languages/tags to ${activity.name} --> ${$source.name} (${$source.language})`);
  //         count++;
  //       }
  //     }

  //     if (count) {
  //       const { id, user, ...others } = activity;
  //       await this.activities.update({ ...others, user, id });
  //     }
  //   }
  // }

  // private async tmpCloneStudySources() {
  //   const path = `${this.config.get('STORAGE_PATH')}/study-clone-cache.txt`;
  //   const cache = await exists(path)
  //     ? (await readFile(path, 'utf-8')).split('\n').map(line => line.trim())
  //     : [];

  //   for (const { id, ...activity } of (
  //     await this.activities.list({ user: 'moh70@pitt.edu', archived: true })
  //   ).filter(a => activities2clone.includes(a.name)).map(useId).map(({ linkings, ...a }) => a)) {
  //     if (cache.includes(activity.name)) {
  //       continue;
  //     }

  //     for (const item of activity.items) {
  //       const { id, ...attrs } = useId(await this.sources.read({ id: item.item, user: activity.user }));
  //       attrs.tags ||= [];
  //       attrs.tags.push('llm-gpt4o');
  //       Object.keys(attrs.lines || {}).forEach(k => {
  //         if (attrs.lines[k].comments?.length > 0)
  //           attrs.lines[k].comments = [{ content: '// TODO: generate' }]
  //       });
  //       attrs.distractors = [];;
  //       item.item = useId(toObject(await this.sources.create({ ...attrs }))).id;
  //     }

  //     await this.activities.create({ ...activity });
  //     cache.push(activity.name);
  //     await appendFile(path, `${activity.name}\n`);
  //     console.log('cloned:', activity.name);
  //   }

  //   this.attachLanguages();
  // }

  private getUserEmail(req: any) { return req.user.email; }

  private attachStat(activity: any) {
    activity.stat = this.compiler.getSizeLastModified(activity.id);
    return activity;
  }

  // @Get('backup')
  // async backup() {
  //   return await this.activities.backup();
  // }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request, @Query('include') include: string) {
    return (await this.activities.list({ user: this.getUserEmail(req), archived: include == 'archived' })).map(activity => {
      const { _id: id, published, archived, name, items, linkings, user, collaborator_emails } = activity;
      return this.attachStat({ id, published, archived, name, items, linkings: Object.keys(linkings || {}).length > 0, user, collaborator_emails });
    }).sort((a, b) => b.id.toString().localeCompare(a.id.toString()));
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: Request, @Body() activity: any) {
    activity = toObject(await this.activities.create({ ...activity, user: this.getUserEmail(req) }));
    return this.attachStat({ id: activity._id });
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();
    const { linkings, ...rest } = activity;
    return this.attachStat(useId(rest));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    await syncToPAWS({
      ds_agg: this.ds_agg,
      ds_um2: this.ds_um2,
      config: this.config,
      activities: this.activities,
      sources: this.sources,
      request: req,
      activity: updates
    });
    await this.activities.update({ ...updates, user: this.getUserEmail(req), _id: id });
  }

  // @Delete(':id')
  // @UseGuards(AuthenticatedGuard)
  // async remove(@Req() req: Request, @Param('id') id: string) {
  //   const activity = await this.activities.read({ user: this.getUserEmail(req), id });
  //   if (!activity) throw new NotFoundException();

  //   await this.activities.remove({ user: this.getUserEmail(req), id });
  // }

  // private async authorizePreview(req: Request, id: string, type: string) {
  // TODO: should we authorize?!
  // let found = null, payload = { user: this.getUserEmail(req), id };
  // /**/ if (type === 'source') found = await this.sources.read(payload);
  // else if (type === 'activity') found = await this.activities.read(payload);
  // if (!found) throw new NotFoundException();
  // }

  @Patch(':id/preview')
  @UseGuards(AuthenticatedGuard)
  async genPreview(@Res() res: Response, @Param('id') id: string, @Body() activity: any) {
    // await this.authorizePreview(req, id, type);
    // await this.compiler.compile({ ...activity, id });
    const worker = new Worker(`${__dirname}/compile.js`, {
      workerData: { ...activity, id },
    });
    worker.on('message', (result) => {
      console.log(result);
      res.json({});
    });
    worker.on('error', (error) => {
      console.error(error);
      res.status(500).json({});
    });
  }

  @Get(':id/preview')
  @UseGuards(AuthenticatedGuard)
  async getPreview(@Req() req: Request, @Param('id') id: string, @Res({ passthrough: true }) res: Response, @Query('type') type: string) {
    // await this.authorizePreview(req, id, type);
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

  @Post(':id/clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Req() req: Request, @Param('id') id: string) {
    const activity = await this.activities.read({ user: this.getUserEmail(req), id });
    if (!activity) throw new NotFoundException();

    const { _id, linkings, ...attrs } = activity;
    attrs.name += ' (clone)';
    const clone = toObject(await this.activities.create({ ...attrs }));
    return { id: clone._id };
  }
}
