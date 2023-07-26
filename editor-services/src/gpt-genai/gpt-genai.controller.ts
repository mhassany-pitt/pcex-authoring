import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { GptGenaiService } from './gpt-genai.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('gpt-genai')
export class GptGenaiController {
  constructor(private service: GptGenaiService) {}

  @Post()
  @UseGuards(AuthenticatedGuard)
  async generate(@Body() body: any) {
    const resp = await this.service.prompt([
      { role: 'user', content: body.message },
    ]);
    return resp.data.choices[0].message.content;
  }
}
