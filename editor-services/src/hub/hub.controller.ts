import {
  Body,
  Controller, Get, NotFoundException,
  Param, Post, Query, Req, Res, StreamableFile,
  UseGuards
} from '@nestjs/common';
import { HubService } from './hub.service';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { toObject, useId } from 'src/utils';
import { UsersService } from 'src/users/users.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('hub')
export class HubController {

  constructor(
    private service: HubService,
    private compiler: CompilerService,
    private users: UsersService
  ) { }

  @Get()
  async index(@Query('key') key: string) {
    const users = (await this.users.listInfo())
      .reduce((map, { email, fullname }) => {
        map[email] = { fullname, email };
        return map;
      }, {});

    return (await this.service.list({ key })).map(activity => {
      const { id, name, items, user } = useId(activity);
      return { id, name, items, author: users[user] };
    }).sort((a, b) => b.id.toString().localeCompare(a.id.toString()));
  }

  @Get(':id')
  async get(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const activity = await this.service.getActivity(id);
    if (!activity || !activity.published)
      throw new NotFoundException();

    res.header('Content-Type', 'application/json');
    res.header('Content-Disposition', `attachment; filename="preview.json"`);
    return new StreamableFile(createReadStream(this.compiler.preview(id)));
  }

  @Post('clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Body() activity: any, @Req() req: Request) {
    const exists = await this.service.getActivity(activity.id);
    if (!exists || !exists.published)
      throw new NotFoundException();

    // validate items
    const vitems = exists.items.map(i => i.item);
    activity.items = activity.items.filter((i: any) => vitems.includes(i.item));

    const user = (req as any).user.email;

    // clone sources
    for (const item of activity.items) {
      const source = toObject(await this.service.getSource(item.item));
      if (!source) continue;

      // clone source
      const { _id, user: $dum1, ...others } = source;
      const srcClone = useId(toObject(
        await this.service.createSource({ ...others, user, name: item.details.name })));

      // update item id
      item.item = srcClone.id;

      // compile source
      const c_items = [{ item$: { ...srcClone, id: `${srcClone.id}_example` }, type: 'example' }];
      const challenge = Object.keys(srcClone.lines).filter(ln => srcClone.lines[ln].blank);
      if (challenge) c_items.push({ item$: { ...srcClone, id: `${srcClone.id}_challenge` }, type: 'challenge' });
      await this.compiler.compile({ id: srcClone.id, name: srcClone.name, items: c_items });
    }

    if (!activity.sourcesOnly) {
      // clone activity
      const { name, items } = activity;
      for (let i = 0; i < items.length; i++) items[i] = {
        item: items[i].item,
        type: items[i].type,
        details: {
          name: items[i].details.name,
          description: items[i].details.description
        }
      };

      // compile activity
      const actClone = useId(toObject(await this.service.createActivity({ user, name, items })));
      await this.compiler.compile(actClone);
    }

    return {};
  }
}
