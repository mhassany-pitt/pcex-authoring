import { Module } from '@nestjs/common';
import { GptGenaiController } from './gpt-genai.controller';
import { GptGenaiService } from './gpt-genai.service';
import { SigcseService } from './sigcse.service';

@Module({
  controllers: [GptGenaiController],
  providers: [GptGenaiService, SigcseService],
})
export class GptGenaiModule {}
