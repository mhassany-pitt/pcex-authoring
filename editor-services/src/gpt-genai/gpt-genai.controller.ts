import {
  Body, Controller, Post,
  UseGuards, Get, Param,
  Req, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GptGenaiService } from './gpt-genai.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { Worker } from 'worker_threads';

@Controller('gpt-genai')
export class GptGenaiController {

  constructor(private service: GptGenaiService) { }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async history(@Req() req, @Param('id') id: string) {
    return this.service.history({ user: req.user.email, id });
  }

  @Get(':id/:timestamp')
  @UseGuards(AuthenticatedGuard)
  async load(@Req() req, @Param('id') id: string, @Param('timestamp') timestamp: string) {
    return this.service.load({ user: req.user.email, id, timestamp });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  generate(@Req() req: any, @Res() res: Response, @Body() body: any) {
    // return await this.service.generate({ user: req.user.email, ...body });
    const worker = new Worker(`${__dirname}/gpt-genai.js`, { workerData: { user: req.user.email, ...body } });
    worker.on('message', (result) => res.json(result));
    worker.on('error', (error) => {
      console.error(error);
      res.status(500).json({});
    });
  }
}
