import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from "openai";
import { ensureDir, writeFile } from 'fs-extra';
import {
  assistantTemplate, distJsonSchema,
  distTaskGenerate, distractorTemplate,
  expJsonSchema, expTaskExplainLn,
  expTaskIdentifyAndExplain, explanationTemplate,
  prepLn2Solution
} from './prompts';

@Injectable()
export class GptGenaiService {

  constructor(private config: ConfigService) { }

  get root() {
    return `${this.config.get('STORAGE_PATH')}/gpt-genai`;
  }

  async generate({ config, user, action, id, language, statement, solution, line_number, n_distractors }) {
    if (action == 'identify-and-explain') {
      return await this.identifyAndExplainLines({ config, user, id, language, statement, solution });
    } else if (action == 'explain-line') {
      return await this.explainTheLine({ config, user, id, language, statement, solution, line_number });
    } else if (action == 'generate-distractors') {
      return await this.generateDistractors({ config, user, id, language, statement, solution, line_number, n_distractors });
    } else {
      throw new Error(`Invalid action: ${action}`);
    }
  }

  async identifyAndExplainLines({ config, user, id, language, statement, solution }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = explanationTemplate
      .replace(/<<task>>/g, expTaskIdentifyAndExplain)
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];

    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({ config, messages, response_json_schema: expJsonSchema });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(response.choices[0].message.content);
  }

  async explainTheLine({ config, user, id, language, statement, solution, line_number }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = explanationTemplate
      .replace(/<<task>>/g, expTaskExplainLn.replace(/<<line_number>>/g, line_number))
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({ config, messages, response_json_schema: expJsonSchema });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(response.choices[0].message.content);
  }

  async generateDistractors({ config, user, id, language, statement, solution, line_number, n_distractors }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = distractorTemplate
      .replace(/<<task>>/g, distTaskGenerate
        .replace(/<<line_number>>/g, line_number)
        .replace(/<<n_distractors>>/g, n_distractors))
      .replace(/<<line_number>>/g, line_number)
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({ config, messages, response_json_schema: distJsonSchema });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(response.choices[0].message.content);
  }

  async validate(config: any) {
    config.model = config.model || 'gpt-4o-mini';
    if (config.model != 'gpt-4o-mini' && !config.api_key)
      throw new Error('API key is required if you are usign a model other than gpt-4o-mini.');
    config.api_key = config.api_key || this.config.get('OPENAI_API_KEY');
    config.organization = config.organization || this.config.get('OPENAI_ORG_ID');
    config.temperature = config.temperature || 0;
    config.max_tokens = config.max_tokens || 2048;
    config.top_p = config.top_p || 1;
    config.frequency_penalty = config.frequency_penalty || 0;
    config.presence_penalty = config.presence_penalty || 0;
    return config;
  }

  private async promptGPT({ messages, config, response_json_schema }) {
    const api = new OpenAI({ apiKey: config.api_key, organization: config.organization });
    const { model, temperature, max_tokens,
      top_p, frequency_penalty, presence_penalty } = config;
    return await api.chat.completions.create({
      messages, model, temperature, max_tokens,
      top_p, frequency_penalty, presence_penalty,
      response_format: {
        type: "json_schema",
        json_schema: { 'name': 'response', schema: JSON.parse(response_json_schema) }
      } as any
    });
  }

  // private removeJsonQuotes(resp: string) {
  //   for (const char of ['"', "'", '`']) {
  //     const quote = char.repeat(3);
  //     if (resp.startsWith(quote + 'json')) resp = resp.substring(7);
  //     if (resp.endsWith(quote)) resp = resp.substring(0, resp.length - 3);
  //   }
  //   return resp.trim();
  // }
}
