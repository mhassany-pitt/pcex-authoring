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
  async clone(@Body() activity: any, @Req() req: any, @Res() res: Response) {
    try {
      const worker = new Worker(`${__dirname}/clone.js`, {
        workerData: {
          user: req.user.email,
          ...activity
        },
      });
      worker.on('message', (result) => res.json(result));
      worker.on('error', (error) => res.status(422).json({ message: error.message }));
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }
  }
}
