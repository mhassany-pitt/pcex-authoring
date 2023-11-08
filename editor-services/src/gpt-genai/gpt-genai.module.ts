import { Module } from '@nestjs/common';
import { GptGenaiController } from './gpt-genai.controller';
import { GptGenaiService } from './gpt-genai.service';

@Module({
  controllers: [GptGenaiController],
  providers: [GptGenaiService],
})
export class GptGenaiModule { }
