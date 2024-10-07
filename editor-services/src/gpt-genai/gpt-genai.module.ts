import { Module } from '@nestjs/common';
import { GptGenaiController } from './gpt-genai.controller';
import { GptGenaiService } from './gpt-genai.service';
import { KeyValueServiceModule } from 'src/keyvalue-service/keyvalue-service.module';

@Module({
  controllers: [GptGenaiController],
  imports: [KeyValueServiceModule],
  providers: [GptGenaiService],
})
export class GptGenaiModule { }
