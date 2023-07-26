import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, OpenAIApi } from 'openai';

@Injectable()
export class GptGenaiService {
  private openai: OpenAIApi;

  constructor(private config: ConfigService) {
    const configuration = new Configuration({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
    this.openai = new OpenAIApi(configuration);
  }
  prompt(messages: any[]) {
    return this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 0.4,
      max_tokens: 1024,
      messages,
    });
  }
}
