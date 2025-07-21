import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, ensureDir } from 'fs-extra';

@Controller()
export class AppController {

  constructor(
    private config: ConfigService,
  ) { }

  @Post('/distractor-explanation/feedback')
  async getFeedback(@Body() feedback: any) {
    const logdir = `${this.config.get('STORAGE_PATH')}/distractor-explanation/`;
    await ensureDir(logdir);

    // rotate log file daily
    const logfile = (new Date()).toISOString().split('T')[0] + '.log';

    const stream = createWriteStream(`${logdir}${logfile}`, { flags: 'a' });
    stream.write(`${Date.now()} - ${JSON.stringify(feedback)}\n`);
    stream.end();

    return {};
  }
}
