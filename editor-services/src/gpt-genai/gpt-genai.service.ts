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
    line_number, n_distractors, distractor, translation, model }, onProgress?: (event: any) => void) {
    if (action == 'identify-and-explain') {
      return await this.identifyAndExplainLines({ config, user, id, language, statement, solution }, onProgress);
    } else if (action == 'explain-line') {
      return await this.explainTheLine({ config, user, id, language, statement, solution, line_number }, onProgress);
    } else if (action == 'generate-distractors') {
      return await this.generateDistractors({ config, user, id, language, statement, solution, line_number, n_distractors }, onProgress);
    } else if (action == 'generate-distractor-explanation') {
      return await this.generateDistractorExplanation({ config, user, id, language, statement, solution, line_number, distractor }, onProgress);
    } else if (action == 'translate-model') {
      return await this.translateModel({ config, user, id, model, translation }, onProgress);
    } else {
      throw new Error(`Invalid action: ${action}`);
    }
  }

  async identifyAndExplainLines({ config, user, id, language, statement, solution }, onProgress?: (event: any) => void) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = expTemplate
      .replace(/<<task>>/g, expTaskIdentifyAndExplain.replace(/<<target_language>>/g,
        config.target_language ? ` in ${config.target_language}` : ''))
      .replace(/<<line_number>>/g, '1')
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const input = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];

    await writeFile(file, JSON.stringify({ request: input }));

    const response = await this.promptGPT({
      config, input, format: {
        type: "json_schema",
        name: 'response',
        strict: true,
        schema: JSON.parse(expJsonSchema),
      } as any
    }, onProgress);
    await writeFile(file, JSON.stringify({ request: input, response }));

    const parsed = JSON.parse(this.removeJsonQuotes(response.output_text));
    const normalized: { [ln: string]: string[] } = {};
    Object.keys(parsed).forEach(k => {
      const cleanNum = k.replace(/\D+/g, '');
      if (cleanNum) {
        normalized[cleanNum] = parsed[k];
      }
    });
    return normalized;
  }

  async explainTheLine({ config, user, id, language, statement, solution, line_number }, onProgress?: (event: any) => void) {
    const path = `${this.root}/${user}/${id}/`;
    const file = `${path}/${new Date().toISOString()}.json`;
    await ensureDir(path);

    const prompt = expTemplate
      .replace(/<<task>>/g, expTaskExplainLn.replace(/<<line_number>>/g, line_number)
        .replace(/<<target_language>>/g, config.target_language ? ` in ${config.target_language}` : ''))
      .replace(/<<line_number>>/g, line_number)
      .replace(/<<problem_language>>/g, language)
      .replace(/<<problem_statement>>/g, statement)
      .replace(/<<problem_solution>>/g, prepLn2Solution(solution));

    const input = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: input }));

    const response = await this.promptGPT({
      config, input, format: {
        type: "json_schema",
        name: 'response',
        strict: true,
        schema: JSON.parse(expJsonSchema),
      } as any
    }, onProgress);
    await writeFile(file, JSON.stringify({ request: input, response }));

    const parsed = JSON.parse(this.removeJsonQuotes(response.output_text));
    const normalized: { [ln: string]: string[] } = {};
    Object.keys(parsed).forEach(k => {
      const cleanNum = k.replace(/\D+/g, '') || String(line_number);
      normalized[cleanNum] = parsed[k];
    });
    return normalized;
  }

  async generateDistractors({ config, user, id, language, statement, solution, line_number, n_distractors }, onProgress?: (event: any) => void) {
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

    const input = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: input }));

    const response = await this.promptGPT({
      config, input, format: {
        type: "json_schema",
        name: 'response',
        strict: true,
        schema: JSON.parse(distJsonSchema),
      } as any
    }, onProgress);
    await writeFile(file, JSON.stringify({ request: input, response }));

    const parsed = JSON.parse(this.removeJsonQuotes(response.output_text));
    const normalized: { [ln: string]: any[] } = {};
    Object.keys(parsed).forEach(k => {
      const cleanNum = k.replace(/\D+/g, '') || String(line_number);
      normalized[cleanNum] = parsed[k];
    });
    return normalized;
  }

  async generateDistractorExplanation({ config, user, id, language, statement, solution, line_number, distractor }, onProgress?: (event: any) => void) {
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

    const input = [
      { role: 'system', content: assistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: input }));

    const response = await this.promptGPT({
      config, input, format: {
        type: "json_schema",
        name: 'response',
        strict: true,
        schema: JSON.parse(distExpJsonSchema),
      } as any
    }, onProgress);
    await writeFile(file, JSON.stringify({ request: input, response }));

    const parsed = JSON.parse(this.removeJsonQuotes(response.output_text));
    const explanation = parsed.explanation || (typeof parsed === 'string' ? parsed : parsed[Object.keys(parsed)[0]]) || '';
    return { explanation };
  }

  async translateModel({ config, user, id, model, translation }, onProgress?: (event: any) => void) {
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

    const input = [
      { role: 'system', content: transAssistantTemplate },
      { role: 'user', content: prompt },
    ];
    await writeFile(file, JSON.stringify({ request: input }));

    const response = await this.promptGPT({ config, input, format: { type: 'text' } }, onProgress);
    await writeFile(file, JSON.stringify({ request: input, response }));

    const translated = response.output_text;

    model.untr_name = model.name; // backup
    model.name = translated.substring(
      translated.indexOf('[[PROGRAM-NAME]]') + '[[PROGRAM-NAME]]'.length,
      translated.indexOf('[[PROGRAM-DESCRIPTION]]')
    ).trim();

    model.untr_description = model.description; // backup
    model.description = translated.substring(
      translated.indexOf('[[PROGRAM-DESCRIPTION]]') + '[[PROGRAM-DESCRIPTION]]'.length,
      translated.indexOf('[[SOURCE-CODE]]')
    ).trim();

    const first = (...indices: number[]) => indices.find(i => i > -1) || -1;

    model.untr_code = model.code; // backup
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
      const line = model.lines[`${parseInt(idxs[0])}`].comments[`${parseInt(idxs[1]) - 1}`];
      line.untr_content = line.content; // backup
      line.content = ps[1];
    }

    if (distExplanations.length) for (const d of translated.substring(
      translated.indexOf('[[LINE-DISTRACTORS]]') + '[[LINE-DISTRACTORS]]'.length
    ).split('\n[[DIST')) {
      if (d.trim().length < 1)
        continue;
      const ps = d.split(']] ');
      const idxs = ps[0].split('.');
      const dist = model.distractors[parseInt(idxs[0]) - 1];
      if (idxs[1] == 'LC') {
        dist.untr_code = dist.code; // backup
        dist.code = ps[1];
      } else if (idxs[1] == 'EXPL') {
        dist.untr_description = dist.description; // backup
        dist.description = ps[1];
      }
    }

    return model;
  }

  getDefaultConfig() {
    return {
      model: this.config.get('OPENAI_MODEL') || 'qwen3.5:397b-cloud',
      baseURL: this.config.get('OPENAI_BASE_URL') || 'https://ollama.com/v1',
    };
  }

  async validate(config: any) {
    const { model: defaultModel, baseURL: defaultBaseURL } = this.getDefaultConfig();
    const serverApiKey = this.config.get('OPENAI_API_KEY');

    const userModel = config.model;
    const userBaseURL = config.baseURL || config.baseUrl;
    const userApiKey = config.apiKey || config.api_key;

    config.model = userModel || defaultModel;
    config.baseURL = userBaseURL || defaultBaseURL;

    const isDefaultModel = (!userModel || userModel === defaultModel);
    const isDefaultBaseURL = (!userBaseURL || userBaseURL === defaultBaseURL);
    const isDefaultSetup = isDefaultModel && isDefaultBaseURL;

    if (!isDefaultSetup && !userApiKey) {
      if (!isDefaultModel && !isDefaultBaseURL) {
        throw new Error(`API key is required if you are using a model other than '${defaultModel}' or a custom baseURL.`);
      } else if (!isDefaultModel) {
        throw new Error(`API key is required if you are using a model other than '${defaultModel}'.`);
      } else {
        throw new Error(`API key is required if you are using a custom baseURL other than '${defaultBaseURL}'.`);
      }
    }

    config.apiKey = userApiKey || serverApiKey || 'ollama';
    return config;
  }

  private async promptGPT({ input, config, format }, onProgress?: (event: any) => void): Promise<any> {
    const {
      // IGNORE these params
      // ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
      target_language,
      translate_classes,
      translate_functions,
      translate_variables,
      translate_strings,
      translate_comments,
      // ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
      // pass the rest to GPT
      apiKey: explicitApiKey, api_key: legacyApiKey,
      baseURL: explicitBaseUrl, baseUrl: altBaseUrl,
      organization, model, text, ...params
    } = config;

    const apiKey = explicitApiKey || legacyApiKey || this.config.get('OPENAI_API_KEY') || 'ollama';
    const baseUrl = explicitBaseUrl || altBaseUrl || this.config.get('OPENAI_BASE_URL') || undefined;
    const orgId = organization || undefined;

    const openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      organization: orgId,
    });

    const isCustomOrOllama = !!baseUrl;

    if (!onProgress && !isCustomOrOllama && (openai as any).responses?.create) {
      try {
        const payload = { ...params, model, text: { ...text, format }, input };
        return await (openai as any).responses.create(payload);
      } catch (e) {
        console.warn('[gpt-genai] responses.create failed, falling back to chat.completions:', e?.message || e);
      }
    }

    // Standard OpenAI-compliant Chat Completions (Ollama, vLLM, LiteLLM, OpenAI)
    const messages = input.map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    const defaultMaxTokens = parseInt(this.config.get('OPENAI_MAX_TOKENS') || '32000', 10);
    const chatPayload: any = {
      model,
      messages,
      max_tokens: params.max_tokens || params.max_completion_tokens || defaultMaxTokens,
      ...params
    };

    if (format?.type === 'json_schema' || format?.schema) {
      chatPayload.response_format = {
        type: 'json_object'
      };
    }

    if (onProgress) {
      chatPayload.stream = true;
      chatPayload.stream_options = { include_usage: true };
      const stream = await openai.chat.completions.create(chatPayload) as any;
      let accumulatedContent = '';
      let accumulatedThinking = '';
      let inThinkTag = false;
      let finishReason: any = null;
      let finalUsage: any = null;

      for await (const chunk of stream) {
        if (chunk.usage) {
          finalUsage = chunk.usage;
          onProgress({ type: 'usage', usage: chunk.usage });
        }

        const choice = chunk.choices?.[0];
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
        const delta = choice?.delta;
        if (!delta) continue;

        // 1. Check for explicit reasoning_content / reasoning delta
        const rText = delta?.reasoning_content || delta?.reasoning || '';
        if (rText) {
          accumulatedThinking += rText;
          onProgress({ type: 'thinking', text: rText, fullThinking: accumulatedThinking });
        }

        // 2. Check for content delta, handling inline <think>...</think> tags if present
        const cText = delta?.content || '';
        if (cText) {
          let remaining = cText;
          while (remaining.length > 0) {
            if (inThinkTag) {
              const closeIdx = remaining.indexOf('</think>');
              if (closeIdx !== -1) {
                const thinkChunk = remaining.slice(0, closeIdx);
                if (thinkChunk) {
                  accumulatedThinking += thinkChunk;
                  onProgress({ type: 'thinking', text: thinkChunk, fullThinking: accumulatedThinking });
                }
                inThinkTag = false;
                remaining = remaining.slice(closeIdx + 8);
              } else {
                accumulatedThinking += remaining;
                onProgress({ type: 'thinking', text: remaining, fullThinking: accumulatedThinking });
                remaining = '';
              }
            } else {
              const openIdx = remaining.indexOf('<think>');
              if (openIdx !== -1) {
                const contentChunk = remaining.slice(0, openIdx);
                if (contentChunk) {
                  accumulatedContent += contentChunk;
                  onProgress({ type: 'content', text: contentChunk, fullContent: accumulatedContent });
                }
                inThinkTag = true;
                remaining = remaining.slice(openIdx + 7);
              } else {
                accumulatedContent += remaining;
                onProgress({ type: 'content', text: remaining, fullContent: accumulatedContent });
                remaining = '';
              }
            }
          }
        }
      }

      return {
        output_text: accumulatedContent,
        thinking_text: accumulatedThinking,
        usage: finalUsage,
        choices: [
          {
            message: {
              role: 'assistant',
              content: accumulatedContent,
              reasoning_content: accumulatedThinking || undefined,
            },
            finish_reason: finishReason || 'stop',
            index: 0,
          }
        ]
      };
    }

    const completion = await openai.chat.completions.create(chatPayload);
    let outputText = (completion as any).choices?.[0]?.message?.content || '';
    let thinkingText = (completion as any).choices?.[0]?.message?.reasoning_content || '';

    if (outputText.includes('<think>')) {
      const thinkMatch = outputText.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinkingText = (thinkingText ? thinkingText + '\n' : '') + thinkMatch[1];
      }
      outputText = outputText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }

    return {
      output_text: outputText,
      thinking_text: thinkingText,
      choices: (completion as any).choices,
      ...completion
    };
  } 

  private removeJsonQuotes(resp: string) {
    if (!resp) return '';
    let cleaned = resp.trim();
    for (const quote of ['```json', '```', '"""', "'''"]) {
      if (cleaned.startsWith(quote)) {
        cleaned = cleaned.slice(quote.length);
        break;
      }
    }
    for (const quote of ['```', '"""', "'''"]) {
      if (cleaned.endsWith(quote)) {
        cleaned = cleaned.slice(0, -quote.length);
        break;
      }
    }
    cleaned = cleaned.trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
  }
}
