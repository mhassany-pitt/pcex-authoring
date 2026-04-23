import {
  Body, Controller, Post,
  UseGuards, Req, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GptGenaiService } from './gpt-genai.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { Worker } from 'worker_threads';
import { KeyValueService } from 'src/keyvalue-service/keyvalue.service';

@Controller('gpt-genai')
export class GptGenaiController {

  constructor(
    private service: GptGenaiService,
    private keyvalueService: KeyValueService,
  ) { }

  // @Get(':id')
  // @UseGuards(AuthenticatedGuard)
  // async history(@Req() req, @Param('id') id: string) {
  //   return this.service.history({ user: req.user.email, id });
  // }

  // @Get(':id/:timestamp')
  // @UseGuards(AuthenticatedGuard)
  // async load(@Req() req, @Param('id') id: string, @Param('timestamp') timestamp: string) {
  //   return this.service.load({ user: req.user.email, id, timestamp });
  // }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async generate(@Req() req: any, @Res() res: Response, @Body() body: any) {
    try {
      const config = await this.keyvalueService.get(req.user.email, 'gpt-config');
      console.log('[gpt-genai controller] starting worker', {
        action: body?.action,
        id: body?.id,
        user: req.user?.email,
      });
      const worker = new Worker(`${__dirname}/gpt-genai.js`, {
        workerData: {
          config: await this.service.validate(config?.value || {}),
          user: req.user.email, ...body
        },
      });
      worker.on('online', () => {
        console.log('[gpt-genai controller] worker online', { action: body?.action, id: body?.id });
      });
      worker.on('message', (result) => {
        console.log('[gpt-genai controller] worker finished', { action: body?.action, id: body?.id });
        res.json(result);
      });
      worker.on('error', (error) => {
        console.error('[gpt-genai controller] worker error', { action: body?.action, id: body?.id, error: error.message });
        res.status(422).json({ message: error.message });
      });
      worker.on('exit', (code) => {
        console.log('[gpt-genai controller] worker exited', { action: body?.action, id: body?.id, code });
      });
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }
  }
}
