import { Body, Req, Controller, Post, UseGuards } from '@nestjs/common';
import { GptGenaiService } from './gpt-genai.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('gpt-genai')
export class GptGenaiController {
  constructor(private service: GptGenaiService) {}

  @Post()
  @UseGuards(AuthenticatedGuard)
  async generate(@Req() req, @Body() body: any) {
    return await this.service.generate({ user: req.user.email, ...body });
  }
}
