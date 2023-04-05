import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ensureDirSync, writeJsonSync, statSync,
  existsSync, rmSync, readJsonSync, readdirSync, createWriteStream
} from 'fs-extra';
import { v4 as uuid4 } from 'uuid';
import { exec, cd } from 'shelljs';
import { SourcesService } from '../sources-service/sources.service';
import { ActivitiesService } from '../activities-service/activities.service';
import { create } from 'archiver';

@Injectable()
export class CompilerService {

  constructor(
    private sources: SourcesService,
    private activities: ActivitiesService,
    private config: ConfigService,
  ) {
    ensureDirSync(this.root);
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
    const activity = this.activities.read(id);
    if (activity == null)
      return null;

    const workspace = `${this.root}/${activity.id}`;
    ensureDirSync(workspace);

    const inputs = `${workspace}/inputs/`;
    ensureDirSync(inputs);

    activity.items.forEach(each => {
      const source = this.sources.read(each.item);

      let lineNum = 1;
      const lineList = (source.code || '').split('\n')
        .map((line: string) => ({
          id: uuid4(),
          number: lineNum++,
          content: line,
          commentList: `${lineNum}` in source.lines
            ? source.lines[`${lineNum}`].comments
              .map(comment => comment.content)
            : [],
          indentLevel: this.indentLevel(line)
        }));

      writeJsonSync(`${inputs}${source.id}`, {
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
      });
    });

    const outputs = `${workspace}/outputs/`;
    if (existsSync(outputs))
      rmSync(outputs, { recursive: true });

    const queries = `${workspace}/queries/`;
    if (existsSync(queries))
      rmSync(queries, { recursive: true });

    const PcExParserRunner = exec(`cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
      `java -cp ${await this.config.get('COMPILER_JAR_NAME')} application.PcExParserRunner "../${inputs}" "../${outputs}"`);
    const UMActivityQueryGenerator = exec(`cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
      `java -cp ${await this.config.get('COMPILER_JAR_NAME')} application.UMActivityQueryGenerator "../${outputs}" "../${queries}"`);

    return {
      PcExParserRunner: {
        code: PcExParserRunner.code,
        stdout: PcExParserRunner.stdout,
        stderr: PcExParserRunner.stderr,
      },
      UMActivityQueryGenerator: {
        code: UMActivityQueryGenerator.code,
        stdout: UMActivityQueryGenerator.stdout,
        stderr: UMActivityQueryGenerator.stderr,
      }
    };
  }

  indentLevel(line: string) {
    line = line.replace(/^(\s+).*$/, "$1");
    var spaces = line.length - line.replace(/[ ]/g, "").length;
    var tabs = line.length - line.replace(/\t/g, "").length;
    return tabs || Math.floor(spaces / 4);
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
