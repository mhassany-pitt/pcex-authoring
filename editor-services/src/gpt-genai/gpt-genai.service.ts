import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from "openai";
import {
  ensureDirSync, writeJsonSync, writeFileSync,
  readFileSync, readdirSync, existsSync, readJsonSync, exists
} from 'fs-extra';
import { preparePrompt1, preparePrompt2 } from './gpt-genai.prompts';

@Injectable()
export class GptGenaiService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
      organization: this.config.get('OPENAI_ORG_ID'),
    });
  }

  get root() {
    return `${this.config.get('STORAGE_PATH')}/gpt-genai`;
  }

  async history({ user, id }) {
    const ws = `${this.root}/${user}/${id}/`;
    return existsSync(ws) ? readdirSync(ws).sort().reverse() : [];
  }

  async load({ user, id, timestamp }) {
    const ws = `${this.root}/${user}/${id}/${timestamp}/`;
    const resp = readdirSync(ws).filter(f => f.indexOf('-response_') >= 0).sort().reverse()[0];
    return {
      params: existsSync(`${ws}/00-prompt.json`) ? readJsonSync(`${ws}/00-prompt.json`) : null,
      explanations: JSON.parse(this.removeJsonQuotes(readFileSync(`${ws}/${resp}`, 'utf-8'))),
    };
  }

  async submit(messages: any[]) {
    return await this.openai.chat.completions.create({
      model:
        JSON.stringify(messages).length > 10000
          ? 'gpt-3.5-turbo-16k'
          : 'gpt-3.5-turbo',
      messages,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
  }

  async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async generate({ skip, wsdir, user, id, description, source, prompt, language }) {
    wsdir = wsdir || this.root;
    const ws = `${wsdir}/${user}/${id}/${new Date().toISOString()}`;

    const existing = readdirSync(wsdir) //
      .filter((f) => f.startsWith(`${user}--${id}`));
    if (skip && existing.length > 0) {
      const existing_dir = `${wsdir}/${existing[0]}`;
      const files = readdirSync(existing_dir) //
        .filter((f) => f.indexOf('-response_') > -1);
      const file = files.sort((a, b) => b.localeCompare(a))[0];
      return readFileSync(`${existing_dir}/${file}`);
    }

    ensureDirSync(ws);

    let resp = '[]', prev = '[]';
    try {
      writeFileSync(`${ws}/00-source.txt`, source);
      writeFileSync(`${ws}/00-prompt.txt`, preparePrompt1({ description, source, prompt, language }));
      writeJsonSync(`${ws}/00-prompt.json`, { id, description, source, prompt, language });

      // 1st prompt
      const messages = [
        { role: 'system', content: 'You are a professor who teaches computer programming.' },
        { role: 'user', content: preparePrompt1({ description, source, prompt, language }) },
      ];
      writeFileSync(
        `${ws}/01-prompt_${new Date().toISOString()}.json`,
        JSON.stringify(messages),
      );
      resp = (await this.submit(messages)).choices[0].message.content;
      resp = this.removeJsonQuotes(resp);
      writeFileSync(`${ws}/02-response_${new Date().toISOString()}.json`, resp);

      // 2nd prompt
      messages.push({ role: 'assistant', content: resp });
      messages.push({ role: 'user', content: preparePrompt2() });
      writeFileSync(
        `${ws}/03-prompt_${new Date().toISOString()}.json`,
        JSON.stringify(messages),
      );
      prev = resp;
      resp = (await this.submit(messages)).choices[0].message.content;
      resp = this.removeJsonQuotes(resp);
      writeFileSync(`${ws}/04-response_${new Date().toISOString()}.json`, resp);

      // // disabled for now
      // // 3rd prompt and more (upto 5th prompt)
      // for (let i = 0, seq = 5; resp != prev && i < 3; i++) {
      //   messages.push({ role: 'assistant', content: resp });
      //   messages.push({ role: 'user', content: preparePrompt3() });
      //   writeFileSync(
      //     `${ws}/${(seq++)
      //       .toString()
      //       .padStart(2, '0')}-prompt_${new Date().toISOString()}.json`,
      //     JSON.stringify(messages),
      //   );
      //   prev = resp;
      //   resp = (await this.submit(messages)).choices[0].message.content;
      //   writeFileSync(
      //     `${ws}/${(seq++)
      //       .toString()
      //       .padStart(2, '0')}-response_${new Date().toISOString()}.json`,
      //     resp,
      //   );
      // }
    } catch (exp) {
      console.log(
        'failed! cleaning up...',
        JSON.stringify({
          status: exp.response.status,
          statusText: exp.response.statusText,
        }),
      );
      // removeSync(ws);
      writeJsonSync(`${ws}/error_${new Date().toISOString()}.json`, {
        status: exp.response.status,
        statusText: exp.response.statusText,
      });
    }
    resp = this.removeJsonQuotes(resp);
    resp = JSON.parse(resp);
    return resp;
  }

  removeJsonQuotes(resp: string) {
    for (const char of ['"', "'", '`']) {
      const quote = char.repeat(3);
      if (resp.startsWith(quote + 'json')) resp = resp.substring(7);
      if (resp.endsWith(quote)) resp = resp.substring(0, resp.length - 3);
    }
    return resp.trim();
  }
}
