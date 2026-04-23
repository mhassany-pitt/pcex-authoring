import {
  Body, Controller, Get, NotFoundException,
  Param, Post, Query, Req, Res, StreamableFile,
  UseGuards
} from '@nestjs/common';
import { HubService } from './hub.service';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { useId } from 'src/utils';
import { UsersService } from 'src/users/users.service';
import { Worker } from 'worker_threads';
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
      const { id, name, items, iso_language_code, 
        translations, user, collaborator_emails } = useId(activity);
      return { id, name, items, author: users[user], 
        iso_language_code, translations, 
        collaborators: collaborator_emails };
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

  @Get(':id/translations')
  async translations(@Param('id') id: string) {
    const activity = await this.service.getActivity(id);
    if (!activity) throw new NotFoundException();
    return activity.translations || {};
  }

  @Post('clone')
  @UseGuards(AuthenticatedGuard)
  async clone(@Body() activity: any, @Req() req: any, @Res() res: Response) {
    try {
      console.log('[hub controller] starting clone worker', {
        id: activity?.id,
        name: activity?.name,
        user: req.user?.email,
      });
      const worker = new Worker(`${__dirname}/clone.js`, {
        workerData: {
          user: req.user.email,
          ...activity
        },
      });
      worker.on('online', () => {
        console.log('[hub controller] clone worker online', { id: activity?.id });
      });
      worker.on('message', (result) => {
        console.log('[hub controller] clone worker finished', { id: activity?.id });
        res.json(result);
      });
      worker.on('error', (error) => {
        console.error('[hub controller] clone worker error', { id: activity?.id, error: error.message });
        res.status(422).json({ message: error.message });
      });
      worker.on('exit', (code) => {
        console.log('[hub controller] clone worker exited', { id: activity?.id, code });
      });
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }
  }
}
