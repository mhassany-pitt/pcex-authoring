import { Body, Req, Controller, Post, UseGuards, Get, Param } from '@nestjs/common';
import { GptGenaiService } from './gpt-genai.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

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
  async generate(@Req() req, @Body() body: any) {
    return await this.service.generate({ user: req.user.email, ...body });
  }
}
