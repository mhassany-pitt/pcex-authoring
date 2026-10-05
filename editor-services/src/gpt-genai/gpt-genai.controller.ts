import {
  Body, Controller, Get, Post, Put,
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

  @Get('config')
  @UseGuards(AuthenticatedGuard)
  async getConfig(@Req() req: any) {
    const config = await this.keyvalueService.get(req.user.email, 'gpt-config');
    return {
      value: config?.value || null,
      defaults: this.service.getDefaultConfig(),
    };
  }

  @Put('config')
  @UseGuards(AuthenticatedGuard)
  async saveConfig(@Req() req: any, @Body() body: any) {
    return await this.keyvalueService.put(req.user.email, 'gpt-config', body.value);
  }

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
        if (result?.error) {
          console.error('[gpt-genai controller] worker error', { action: body?.action, id: body?.id, error: result.error });
          return res.status(422).json({ message: result.error });
        }
        console.log('[gpt-genai controller] worker finished', { action: body?.action, id: body?.id });
        res.json(result);
      });
      worker.on('error', (error) => {
        console.error('[gpt-genai controller] worker error', { action: body?.action, id: body?.id, error: error.message });
        if (!res.headersSent) {
          res.status(422).json({ message: error.message });
        }
      });
      worker.on('exit', (code) => {
        console.log('[gpt-genai controller] worker exited', { action: body?.action, id: body?.id, code });
        if (!res.headersSent) {
          res.status(500).json({ message: `Worker exited with code ${code} without sending a response` });
        }
      });
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }
  }
}
