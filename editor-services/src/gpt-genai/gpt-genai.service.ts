import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from "openai";
import { ensureDir, writeFile } from 'fs-extra';
import {
  assistantTemplate, distExpJsonSchema, distJsonSchema,
  distTaskGenerate, distExpTemplate, distTemplate,
  expJsonSchema, expTaskExplainLn, expTaskIdentifyAndExplain,
  expTemplate, prepLn2Solution, transAssistantTemplate, transInst,
  transModelDistLn, transModelDistLnExp, transModelLnExp,
  transModelSrcLine, transModelTemplate, transSrcCodeElmsInst,
} from './prompts';
import { zfill } from 'src/utils';

@Injectable()
export class GptGenaiService {

  constructor(private config: ConfigService) { }

  get root() {
    return `${this.config.get('STORAGE_PATH')}/gpt-genai`;
  }

  async generate({ config, user, action, id, language, statement, solution,
    line_number, n_distractors, distractor, translation, model }) {
    if (action == 'identify-and-explain') {
      return await this.identifyAndExplainLines({ config, user, id, language, statement, solution });
    } else if (action == 'explain-line') {
      return await this.explainTheLine({ config, user, id, language, statement, solution, line_number });
    } else if (action == 'generate-distractors') {
      return await this.generateDistractors({ config, user, id, language, statement, solution, line_number, n_distractors });
    } else if (action == 'generate-distractor-explanation') {
      return await this.generateDistractorExplanation({ config, user, id, language, statement, solution, line_number, distractor });
    } else if (action == 'translate-model') {
      return await this.translateModel({ config, user, id, model, translation });
    } else {
      throw new Error(`Invalid action: ${action}`);
    }
  }

  async identifyAndExplainLines({ config, user, id, language, statement, solution }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = expTemplate
      .replace(/<<task>>/g, expTaskIdentifyAndExplain.replace(/<<target_language>>/g, config.target_language ? ` in ${config.target_language}` : ''))
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];

    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({
      config, messages, response_format: {
        type: "json_schema",
        json_schema: { 'name': 'response', schema: JSON.parse(expJsonSchema) }
      } as any
    });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(this.removeJsonQuotes(response.choices[0].message.content));
  }

  async explainTheLine({ config, user, id, language, statement, solution, line_number }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = expTemplate
      .replace(/<<task>>/g, expTaskExplainLn.replace(/<<line_number>>/g, line_number)
        .replace(/<<target_language>>/g, config.target_language ? ` in ${config.target_language}` : ''))
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({
      config, messages, response_format: {
        type: "json_schema",
        json_schema: { 'name': 'response', schema: JSON.parse(expJsonSchema) }
      } as any
    });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(this.removeJsonQuotes(response.choices[0].message.content));
  }

  async generateDistractors({ config, user, id, language, statement, solution, line_number, n_distractors }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = distTemplate
      .replace(/<<task>>/g, distTaskGenerate
        .replace(/<<line_number>>/g, line_number)
        .replace(/<<n_distractors>>/g, n_distractors)
        .replace(/<<target_language_instruction>>/g, config.target_language
          ? transInst.replace(/<<target_language>>/g, config.target_language)
          : ''))
      .replace(/<<line_number>>/g, line_number)
      .replace(/<<line_content>>/g, (solution.split('\n')[line_number - 1] || '').trim())
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({
      config, messages, response_format: {
        type: "json_schema",
        json_schema: { 'name': 'response', schema: JSON.parse(distJsonSchema) }
      } as any
    });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(this.removeJsonQuotes(response.choices[0].message.content));
  }

  async generateDistractorExplanation({ config, user, id, language, statement, solution, line_number, distractor }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = distExpTemplate
      .replace(/<<target_language_instruction>>/g, config.target_language
        ? transInst.replace(/<<target_language>>/g, config.target_language)
        : '')
      .replace(/<<candidate_distractor>>/g, distractor)
      .replace(/<<line_number>>/g, line_number)
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const messages = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({
      config, messages, response_format: {
        type: "json_schema",
        json_schema: { 'name': 'response', schema: JSON.parse(distExpJsonSchema) }
      } as any
    });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    return JSON.parse(this.removeJsonQuotes(response.choices[0].message.content));
  }

  async translateModel({ config, user, id, model, translation }) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}-translation.json`;
    await ensureDir(path);

    const lineExplanations = [];
    Object.keys(model.lines).sort((a, b) => parseInt(a) - parseInt(b)).forEach(ln => {
      model.lines[`${ln}`].comments.forEach((comment: any, i: number) => {
        if (comment.content)
          lineExplanations.push(transModelLnExp
            .replace('<<line-number>>', zfill(parseInt(ln), 2))
            .replace('<<explanation-number>>', `${i + 1}`)
            .replace('<<explanation-content>>', comment.content));
      })
    });

    const distExplanations = [];
    model.distractors.forEach((distractor: any, i: number) => {
      if (distractor.code)
        distExplanations.push(transModelDistLn
          .replace('<<distractor-number>>', `${i + 1}`)
          .replace('<<line-content>>', distractor.code));
      if (distractor.description)
        distExplanations.push(transModelDistLnExp
          .replace('<<distractor-number>>', `${i + 1}`)
          .replace('<<line-explanation>>', distractor.description));
    });

    const sourceCode = model.code.split('\n').map((line: string, lidx: number) => transModelSrcLine
      .replace('<<line-number>>', zfill(lidx + 1, 2))
      .replace('<<line-content>>', line)).join('\n');

    const join = (arr: string[], sep2 = ' and ') => arr.length < 3 ? arr.join(sep2)
      : `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;

    const srcFlags = {
      'classes': translation.translate_classes,
      'functions/methods': translation.translate_functions,
      'variables': translation.translate_variables,
      'string-literals': translation.translate_strings,
      'comments': translation.translate_comments,
    };
    const transElms = Object.keys(srcFlags).filter(k => srcFlags[k]);

    const sectFlags = {
      '[[SOURCE-CODE]]': transElms.length > 0,
      '[[LINE-EXPLANATIONS]]': lineExplanations.length > 0,
      '[[LINE-DISTRACTORS]]': distExplanations.length > 0,
    };

    const prompt = transModelTemplate
      .replace(/<<program-name>>/g, model.name)
      .replace(/<<program-description>>/g, model.description)
      .replace(/<<source-code>>/g, sourceCode)
      .replace(/<<line-explanations>>/g, lineExplanations.length ? `\n[[LINE-EXPLANATIONS]]\n${lineExplanations.join('\n')}\n` : '')
      .replace(/<<line-distractors>>/g, distExplanations.length ? `\n[[LINE-DISTRACTORS]]\n${distExplanations.join('\n')}\n` : '')
      .replace(/<<target-language>>/g, translation.target_language)
      .replace(/<<translate-sections>>/g, join(['[[PROGRAM-NAME]]', '[[PROGRAM-DESCRIPTION]]', ...Object.keys(sectFlags).filter(k => sectFlags[k])]))
      .replace(/<<src-translation-instruction>>/g, transElms.length ? transSrcCodeElmsInst.replace('<<elements>>', join(transElms)) : '');

    const messages = [
      { role: 'system', content: transAssistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: messages }));

    const response = await this.promptGPT({ config, messages, response_format: { type: 'text' } });
    await writeFile(file, JSON.stringify({ request: messages, response }));

    const translated = response.choices[0].message.content;

    model.name = translated.substring(
      translated.indexOf('[[PROGRAM-NAME]]') + '[[PROGRAM-NAME]]'.length,
      translated.indexOf('[[PROGRAM-DESCRIPTION]]')
    ).trim();

    model.description = translated.substring(
      translated.indexOf('[[PROGRAM-DESCRIPTION]]') + '[[PROGRAM-DESCRIPTION]]'.length,
      translated.indexOf('[[SOURCE-CODE]]')
    ).trim();

    const first = (...indices: number[]) => indices.find(i => i > -1) || -1;

    model.code = translated.substring(
      translated.indexOf('[[SOURCE-CODE]]') + '[[SOURCE-CODE]]'.length,
      first(translated.indexOf('[[LINE-EXPLANATIONS]]'), translated.indexOf('[[LINE-DISTRACTORS]]'), translated.length)
    ).split('\n[[LINE').map(l => l.substring(l.indexOf(']]') + ']]'.length + 1)).join('\n').trim();

    if (lineExplanations.length) for (const l of translated.substring(
      translated.indexOf('[[LINE-EXPLANATIONS]]') + '[[LINE-EXPLANATIONS]]'.length,
      first(translated.indexOf('[[LINE-DISTRACTORS]]'), translated.length)
    ).split('\n[[LINE')) {
      if (l.trim().length < 1)
        continue;
      const ps = l.split(']] ');
      const idxs = ps[0].replace('EXPL', '').split('.');
      model.lines[`${parseInt(idxs[0])}`].comments[`${parseInt(idxs[1]) - 1}`].content = ps[1];
    }

    if (distExplanations.length) for (const d of translated.substring(
      translated.indexOf('[[LINE-DISTRACTORS]]') + '[[LINE-DISTRACTORS]]'.length
    ).split('\n[[DIST')) {
      if (d.trim().length < 1)
        continue;
      const ps = d.split(']] ');
      const idxs = ps[0].split('.');
      const dist = model.distractors[parseInt(idxs[0]) - 1];
      if (idxs[1] == 'LC') /*  */ dist.code = ps[1]
      else if (idxs[1] == 'EXPL') dist.description = ps[1]
    }

    return model;
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

  private async promptGPT({ messages, config, response_format }) {
    const api = new OpenAI({ apiKey: config.api_key, organization: config.organization });
    const { model, temperature, max_tokens,
      top_p, frequency_penalty, presence_penalty } = config;
    return await api.chat.completions.create({
      messages, model, temperature, max_tokens,
      top_p, frequency_penalty, presence_penalty
    });
  }

  private removeJsonQuotes(resp: string) {
    for (const quote of ['"""', "'''", '```']) {
      if (resp.startsWith(quote + 'json')) resp = resp.substring(7);
      if (resp.endsWith(quote)) resp = resp.substring(0, resp.length - 3);
    }
    return resp.trim();
  }
}
