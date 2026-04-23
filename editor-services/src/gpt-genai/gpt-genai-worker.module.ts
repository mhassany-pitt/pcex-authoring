import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GptGenaiService } from './gpt-genai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${(process.env.NODE_ENV || 'development').toLowerCase()}`,
    }),
  ],
  providers: [GptGenaiService],
})
export class GptGenaiWorkerModule {}
