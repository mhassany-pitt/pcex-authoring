import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, OpenAIApi } from 'openai';
import { ensureDirSync, writeJsonSync, writeFileSync } from 'fs-extra';

@Injectable()
export class GptGenaiService {
  private openai: OpenAIApi;

  constructor(private config: ConfigService) {
    const configuration = new Configuration({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
    this.openai = new OpenAIApi(configuration);
  }

  get root() {
    return `${this.config.get('STORAGE_PATH')}/gpt-genai`;
  }

  async submit(messages: any[]) {
    return await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
  }

  async generate({ user, id, description, source, prompt }) {
    const ws = `${this.root}/${user}--${id}__${new Date().toISOString()}`;
    ensureDirSync(ws);

    let resp: any = '[]';
    try {
      writeFileSync(`${ws}/00-source.txt`, source);
      writeFileSync(
        `${ws}/00-prompt.txt`,
        this.preparePrompt1({ description, source, prompt }),
      );

      // 1st prompt
      const messages = [
        {
          role: 'system',
          content: 'You are a professor who teaches computer programming.',
        },
        {
          role: 'user',
          content: this.preparePrompt1({ description, source, prompt }),
        },
      ];
      writeFileSync(
        `${ws}/01-prompt_${new Date().toISOString()}.json`,
        JSON.stringify(messages),
      );
      resp = (await this.submit(messages)).data.choices[0].message.content;
      writeFileSync(`${ws}/02-response_${new Date().toISOString()}.json`, resp);

      // 2nd prompt
      messages.push({ role: 'assistant', content: resp });
      messages.push({ role: 'user', content: this.preparePrompt2() });
      writeFileSync(
        `${ws}/03-prompt_${new Date().toISOString()}.json`,
        JSON.stringify(messages),
      );
      resp = (await this.submit(messages)).data.choices[0].message.content;
      writeFileSync(`${ws}/04-response_${new Date().toISOString()}.json`, resp);

      // 3rd prompt
      messages.push({ role: 'assistant', content: resp });
      messages.push({ role: 'user', content: this.preparePrompt3() });
      writeFileSync(
        `${ws}/05-prompt_${new Date().toISOString()}.json`,
        JSON.stringify(messages),
      );
      resp = (await this.submit(messages)).data.choices[0].message.content;
      writeFileSync(`${ws}/06-response_${new Date().toISOString()}.json`, resp);
    } catch (exp) {
      writeJsonSync(`${ws}/error_${new Date().toISOString()}.json`, {
        status: exp.response.status,
        statusText: exp.response.statusText,
      });
      console.log(exp);
    }
    return resp;
  }

  preparePrompt1({ description, source, prompt }) {
    return `
Given the following program description and accompanying source code, identify and explain lines of the code that contributes directly to the program objectives and goals. ${
      prompt.inclusion
    } ${prompt.exclusion}

${prompt.explanation}

Program Description:
${description}

Program Source Code:
The line number is defined as /*line_num*/ at the start of each line.

'''java
${source
  .split('\n')
  .map((line, i) => `/*${i + 1}*/${line}`)
  .join('\n')}
'''

Output format:
You must respond ONLY with the following JSON format:

'''json
[
  {
    "line_num": "[the line number]",
    "content": "[the line content]",
    "explanations": [
      "[the list of explanations]",
      ...
    ]
  },
  ...
]
'''`;
  }
  preparePrompt2() {
    return `Update your explanations with more insightful and complementary YET COMPLETELY new explanations. If you missed a line, this is the time to include them.`;
  }
  preparePrompt3() {
    return `Please repeat that once more.`;
  }
}
