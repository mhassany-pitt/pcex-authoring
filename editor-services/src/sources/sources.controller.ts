import {
  Body, Controller, Delete, Get,
  NotFoundException, Param, Patch, Post, Query, Req, UseGuards
} from '@nestjs/common';
import { SourcesService } from '../sources-service/sources.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { toObject, useId } from 'src/utils';
import { Request } from 'express';

@Controller('sources')
export class SourcesController {

  constructor(
    private sources: SourcesService,
  ) { }

  // @Get('samples')
  // async samples() {
  //   return await this.sources.samples();
  // }

  private getUserEmail(req: any) { return req.user.email; }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request, @Query('include') include: string) {
    return (await this.sources.list({ user: this.getUserEmail(req), archived: include == 'archived' })).map(source => {
      const { _id: id, archived, name, description } = source;
      return { id, archived, name, description };
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: Request) {
    const user = this.getUserEmail(req);
    const source = toObject(await this.sources.create({ user }));
    await this.sources.log({ id: source._id, log: { type: 'create', user } });
    return { id: source._id };
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async read(@Req() req: Request, @Param('id') id: string) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    return useId(source);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    await this.sources.update({ ...updates, user: this.getUserEmail(req), _id: id });
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    await this.sources.remove({ user: this.getUserEmail(req), id });
  }

  @Post(':id/log')
  @UseGuards(AuthenticatedGuard)
  async log(@Req() req: Request, @Param('id') id: string, @Body() log: any) {
    await this.sources.log({ id, log });
  }

  @Post(':id/clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Req() req: Request, @Param('id') id: string) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    const { _id, ...attrs } = source;
    attrs.name += ' (clone)';
    const clone = toObject(await this.sources.create({ ...attrs }));
    return { id: clone._id };
  }
}
