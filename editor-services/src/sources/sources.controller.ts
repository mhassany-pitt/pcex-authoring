import {
  Body, Controller, Delete, Get,
  NotFoundException, Param, Patch, Post, Req, UseGuards
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

  private getUserEmail(req: any) { return req.user.email; }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: Request) {
    return (await this.sources.list({ user: this.getUserEmail(req) })).map(source => {
      const { _id: id, name, description } = source;
      return { id, name, description };
    });
  }

  @Post()
  async create(@Req() req: Request) {
    const source = toObject(await this.sources.create({ user: this.getUserEmail(req) }));
    return { id: source._id };
  }

  @Get(':id')
  async read(@Req() req: Request, @Param('id') id: string) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    return useId(source);
  }

  @Patch(':id')
  async patch(@Req() req: Request, @Param('id') id: string, @Body() updates: any) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    await this.sources.update({ ...updates, user: this.getUserEmail(req), _id: id });
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const source = await this.sources.read({ user: this.getUserEmail(req), id });
    if (!source) throw new NotFoundException();

    await this.sources.remove({ user: this.getUserEmail(req), id });
  }
}
