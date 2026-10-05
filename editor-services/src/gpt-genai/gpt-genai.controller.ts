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
    const isStream = req.query?.stream === 'true';
    try {
      const config = await this.keyvalueService.get(req.user.email, 'gpt-config');
      console.log('[gpt-genai controller] starting worker', {
        action: body?.action,
        id: body?.id,
        user: req.user?.email,
        stream: isStream,
      });

      if (isStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
      }

      const worker = new Worker(`${__dirname}/gpt-genai.js`, {
        workerData: {
          config: await this.service.validate(config?.value || {}),
          user: req.user.email, ...body
        },
      });

      req.on('close', () => {
        worker.terminate().catch(() => undefined);
      });

      worker.on('online', () => {
        console.log('[gpt-genai controller] worker online', { action: body?.action, id: body?.id });
      });

      worker.on('message', (msg) => {
        if (msg?.event === 'progress') {
          if (isStream && !res.writableEnded) {
            res.write(`data: ${JSON.stringify(msg)}\n\n`);
          }
          return;
        }

        if (msg?.event === 'error' || msg?.error) {
          const err = msg.error || msg.data;
          console.error('[gpt-genai controller] worker error', { action: body?.action, id: body?.id, error: err });
          if (isStream) {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ event: 'error', error: err })}\n\n`);
              res.end();
            }
          } else if (!res.headersSent) {
            return res.status(422).json({ message: err });
          }
          return;
        }

        if (msg?.event === 'done') {
          console.log('[gpt-genai controller] worker finished', { action: body?.action, id: body?.id });
          if (isStream) {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ event: 'done', result: msg.result })}\n\n`);
              res.end();
            }
          } else if (!res.headersSent) {
            res.json(msg.result);
          }
          return;
        }

        // fallback for any raw legacy message
        if (!isStream && !res.headersSent) {
          res.json(msg);
        }
      });

      worker.on('error', (error) => {
        console.error('[gpt-genai controller] worker error', { action: body?.action, id: body?.id, error: error.message });
        if (isStream) {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ event: 'error', error: error.message })}\n\n`);
            res.end();
          }
        } else if (!res.headersSent) {
          res.status(422).json({ message: error.message });
        }
      });

      worker.on('exit', (code) => {
        console.log('[gpt-genai controller] worker exited', { action: body?.action, id: body?.id, code });
        if (isStream) {
          if (!res.writableEnded) {
            if (code !== 0) {
              res.write(`data: ${JSON.stringify({ event: 'error', error: `Worker exited with code ${code}` })}\n\n`);
            }
            res.end();
          }
        } else if (!res.headersSent) {
          res.status(500).json({ message: `Worker exited with code ${code} without sending a response` });
        }
      });
    } catch (error) {
      if (isStream) {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'text/event-stream');
        }
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ event: 'error', error: error.message })}\n\n`);
          res.end();
        }
      } else {
        return res.status(422).json({ message: error.message });
      }
    }
  }
}
