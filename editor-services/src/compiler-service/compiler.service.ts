import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ensureDirSync, writeJsonSync, statSync, readJSONSync,
  existsSync, rmSync, readJsonSync, readdirSync, createWriteStream
} from 'fs-extra';
import { v4 as uuid4 } from 'uuid';
import { exec, cd } from 'shelljs';
import { SourcesService } from '../sources-service/sources.service';
import { ActivitiesService } from '../activities-service/activities.service';
import { create } from 'archiver';
import deepEqual from 'deep-equal';

@Injectable()
export class CompilerService {

  constructor(
    private sources: SourcesService,
    private activities: ActivitiesService,
    private config: ConfigService,
  ) {
    ensureDirSync(this.root);
  }

  copyJson(json) {
    return JSON.parse(JSON.stringify(json));
  }

  removeAttribute(json, attrName) {
    for (var key in json) {
      if (typeof json[key] === 'object' && json[key] !== null) {
        this.removeAttribute(json[key], attrName);
      } else if (key === attrName) {
        delete json[key];
      }
    }
    return json;
  }

  get root() {
    return `${this.config.get('STORAGE')}/compiler`;
  }

  exists(id: string) {
    const outputsDir = `${this.root}/${id}/outputs`;
    return existsSync(outputsDir) && readdirSync(outputsDir).length > 0;
  }

  stat(id: string) {
    if (this.exists(id)) {
      const outputsDir = `${this.root}/${id}/outputs`;
      const outputs = readdirSync(outputsDir);
      const stat = statSync(`${outputsDir}/${outputs[0]}`);
      return {
        size: stat.size,
        lastTimeModified: stat.mtimeMs,
      };
    }

    return null;
  }

  path(id: string) {
    const outputsDir = `${this.root}/${id}/outputs`;
    const outputs = readdirSync(outputsDir);
    return outputs.length ? `${outputsDir}/${outputs[0]}` : null;
  }

  read(id: string) {
    const path = this.path(id);
    return path ? readJsonSync(path) : null;
  }

  async compile(id: any) {
    return this.compile$(this.activities.read(id), { json: true, queries: true });
  }

  async compile$(activity: any, config: { json: boolean, queries: boolean }) {
    if (activity == null)
      return null;

    const workspace = `${this.root}/${activity.id}`;
    ensureDirSync(workspace);

    const inputs = `${workspace}/inputs/`;
    ensureDirSync(inputs);

    const changes = activity.items.filter(each => {
      const source = each.item$ || this.sources.read(each.item);

      let lineNum = 1;
      const lineList = (source.code || '').split('\n')
        .map((line: string) => ({
          id: uuid4(),
          number: lineNum++,
          content: line,
          commentList: `${lineNum}` in source.lines
            ? source.lines[`${lineNum}`].comments
              .map(comment => comment.content)
              .filter(content => content)
            : [],
          indentLevel: this.indentLevel(line)
        }));

      const newJson = {
        id: source.id,
        activityName: activity.name,
        order: 0,
        name: source.name,
        goalDescription: source.description,
        language: source.language.toUpperCase(),
        userInput: source.userInput || '',
        filename: source.filename,
        lineList,
        distractorList: (source.distractors || [])
          .map((distractor: any) => ({
            id: uuid4(),
            line: {
              id: uuid4(),
              number: 0,
              content: distractor.code,
              commentList: [distractor.description],
              indentLevel: this.indentLevel(distractor.code)
            }
          })),
        blankLineList: Object.keys(source.lines || {})
          .filter(lineNum => source.lines[lineNum].blank)
          .map(lineNum => ({
            id: uuid4(),
            line: lineList[parseInt(lineNum) - 1],
            helpList: lineList[parseInt(lineNum) - 1].commentList
          })),
        fullyWorkedOut: each.type == 'example'
      };

      const jsonfile = `${inputs}${source.id}`;
      if (existsSync(jsonfile) && deepEqual(
        this.removeAttribute(readJsonSync(jsonfile), 'id'),
        this.removeAttribute(this.copyJson(newJson), 'id')
      )) return false; // skip unchanged source items

      writeJsonSync(jsonfile, newJson);
      return true;
    });

    const resp: any = {};

    // skip compilation if nothing is changed
    if (changes.length < 1)
      return resp;

    const outputs = `${workspace}/outputs/`;
    if (existsSync(outputs))
      rmSync(outputs, { recursive: true });

    if (config.json || config.queries /* prerequisite for queries */) {
      const PcExParserRunner = exec(`cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
        `java -cp ${await this.config.get('COMPILER_JAR_NAME')} application.PcExParserRunner "../${inputs}" "../${outputs}"`);

      resp.PcExParserRunner = {
        code: PcExParserRunner.code,
        stdout: PcExParserRunner.stdout,
        stderr: PcExParserRunner.stderr,
      };
    }

    if (config.queries) {
      const queries = `${workspace}/queries/`;
      if (existsSync(queries))
        rmSync(queries, { recursive: true });

      const UMActivityQueryGenerator = exec(`cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
        `java -cp ${await this.config.get('COMPILER_JAR_NAME')} application.UMActivityQueryGenerator "../${outputs}" "../${queries}"`);

      resp.UMActivityQueryGenerator = {
        code: UMActivityQueryGenerator.code,
        stdout: UMActivityQueryGenerator.stdout,
        stderr: UMActivityQueryGenerator.stderr,
      };
    }

    return resp;
  }

  preview(id: string) {
    const outputs = `${this.root}/${id}/outputs`;
    if (!existsSync(outputs))
      return null;
    return `${outputs}/${readdirSync(outputs)[0]}`;
  }

  indentLevel(line: string) {
    // \t = 4 whitespaces
    line = line.replace(/^\t+/g, '    ');
    const leading = line.match(/^\s+/);
    return leading ? Math.floor(leading[0].length / 4) : 0;
  }

  async archive(id: string) {
    const workspace = `${this.root}/${id}`;
    if (!existsSync(workspace))
      return null;

    const tmpdir = `${this.config.get('STORAGE')}/tmp/`;
    ensureDirSync(tmpdir);

    const output = `${tmpdir}${id}.zip`;
    if (existsSync(output))
      rmSync(output);

    const archive = create('zip', { zlib: { level: 9 } });
    archive.pipe(createWriteStream(output));
    archive.directory(`${workspace}/outputs/`, false);
    const queries = `${workspace}/queries/`;
    archive.directory(`${queries}${readdirSync(queries)[0]}`, false);
    await archive.finalize();

    return output;
  }
}
