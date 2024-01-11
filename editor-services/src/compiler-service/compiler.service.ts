import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ensureDirSync, writeJsonSync, statSync,
  existsSync, rmSync, readJsonSync, readdirSync,
  createWriteStream, rmdirSync
} from 'fs-extra';
import { v4 as uuid4 } from 'uuid';
import { exec } from 'shelljs';
import { SourcesService } from '../sources-service/sources.service';
import { ActivitiesService } from '../activities-service/activities.service';
import { create } from 'archiver';
import deepEqual from 'deep-equal';
import { useId } from 'src/utils';
import { renameSync } from 'fs';

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
    for (const key in json) {
      if (typeof json[key] === 'object' && json[key] !== null) {
        this.removeAttribute(json[key], attrName);
      } else if (key === attrName) {
        delete json[key];
      }
    }
    return json;
  }

  get root() {
    return `${this.config.get('STORAGE_PATH')}/compiler`;
  }

  exists(id: string) {
    const outputsDir = `${this.root}/${id}/outputs`;
    return existsSync(outputsDir) && readdirSync(outputsDir).length > 0;
  }

  getSizeLastModified(id: string) {
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

  getOutputJsonPath(activityId: string) {
    const dir = `${this.root}/${activityId}/outputs`;
    const files = readdirSync(dir);
    return files.length ? `${dir}/${files[0]}` : null;
  }

  readOutputJson(activityId: string) {
    const path = this.getOutputJsonPath(activityId);
    return path ? readJsonSync(path) : null;
  }

  async compile(activity: any) {
    if (activity == null)
      return null;

    const workspace = `${this.root}/${activity.id}`;
    ensureDirSync(workspace);

    try {
      const inputs = `${workspace}/inputs/`;
      if (existsSync(inputs))
        rmSync(inputs, { recursive: true });
      ensureDirSync(inputs);

      // const changes = [];
      for (let i = 0; i < activity.items.length; i++) {
        const item = activity.items[i];
        const source = item.item$ || useId(await this.sources.read({ user: activity.user, id: item.item }));

        const clines = (source.code || '').split('\n');
        const lineList = clines.map((line: string, lineNum: number) => ({
          id: uuid4(),
          number: ++lineNum, // ++: index->lineNum
          content: line,
          commentList: `${lineNum}` in (source.lines || {})
            ? source.lines[`${lineNum}`].comments
              .map(comment => comment.content)
              .filter(content => content)
            : [],
          indentLevel: this.calcIndentLevel(line)
        }));

        const newJson = {
          id: source.id,
          activityName: activity.name,
          order: 0,
          name: source.name,
          goalDescription: source.description || '',
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
                indentLevel: this.calcIndentLevel(distractor.code)
              }
            })),
          blankLineList: Object.keys(source.lines || {})
            .filter(lineNum => source.lines[lineNum].blank)
            .map(lineNum => ({
              id: uuid4(),
              line: lineList[parseInt(lineNum) - 1],
              helpList: lineList[parseInt(lineNum) - 1].commentList
            })),
          fullyWorkedOut: item.type == 'example'
        };

        const jsonfile = `${inputs}${source.id}_${item.type}_${i}`;
        // if (existsSync(jsonfile) && deepEqual(
        //   this.removeAttribute(readJsonSync(jsonfile), 'id'),
        //   this.removeAttribute(this.copyJson(newJson), 'id')
        // )) return false; // skip unchanged source items

        writeJsonSync(jsonfile, newJson);
        // changes.push(item);
      }

      const resp: any = {};

      // // skip compilation if nothing is changed
      // if (changes.length < 1)
      //   return resp;

      const outputs = `${workspace}/outputs/`;
      if (existsSync(outputs))
        rmSync(outputs, { recursive: true });

      const PcExParserRunner = exec(`cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
        `java -cp ${await this.config.get('COMPILER_JAR_NAME')} application.PcExParserRunner "../${inputs}" "../${outputs}"`);

      resp.PcExParserRunner = {
        code: PcExParserRunner.code,
        stdout: PcExParserRunner.stdout,
        stderr: PcExParserRunner.stderr,
      };

      const queries = `${workspace}/queries/`;
      if (existsSync(queries))
        rmSync(queries, { recursive: true });

      const UMActivityQueryGenerator = exec(`cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
        `java -cp ${await this.config.get('COMPILER_JAR_NAME')} application.UMActivityQueryGenerator "../${outputs}" "../${queries}"`);

      // temporary append .sql extension to all files
      readdirSync(queries).forEach(dir =>
        readdirSync(`${queries}/${dir}`)
          .filter(file => !file.endsWith('.sql'))
          .forEach(file => renameSync(`${queries}/${dir}/${file}`, `${queries}/${dir}/${file}.sql`)));

      resp.UMActivityQueryGenerator = {
        code: UMActivityQueryGenerator.code,
        stdout: UMActivityQueryGenerator.stdout,
        stderr: UMActivityQueryGenerator.stderr,
      };

      return resp;
    } catch (exp) {
      console.error(exp);

      rmdirSync(workspace, { recursive: true });
      console.log(`cleared workspace: ${workspace}`);

      return null;
    }
  }

  preview(activityId: string) {
    const outputs = `${this.root}/${activityId}/outputs`;
    if (!existsSync(outputs)) return null;
    return `${outputs}/${readdirSync(outputs)[0]}`;
  }

  calcIndentLevel(line: string) {
    // \t = 4 whitespaces
    line = line.replace(/^\t+/g, '    ');
    const leading = line.match(/^\s+/);
    return leading ? Math.floor(leading[0].length / 4) : 0;
  }

  async archive(activityId: string) {
    const workspace = `${this.root}/${activityId}`;
    if (!existsSync(workspace))
      return null;

    const tmpdir = `${this.config.get('STORAGE_PATH')}/tmp/`;
    ensureDirSync(tmpdir);

    const output = `${tmpdir}${activityId}.zip`;
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
