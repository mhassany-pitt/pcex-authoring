import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ensureDirSync, writeJsonSync, statSync,
    existsSync, rmSync, readJsonSync, readdirSync
} from 'fs-extra';
import { v4 as uuid4 } from 'uuid';
import { exec, cd } from 'shelljs';
import { SourcesService } from '../sources-service/sources.service';
import { ActivitiesService } from '../activities-service/activities.service';

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
        return this.config.get('STORAGE') + '/compiler';
    }

    exists(id: string) {
        const outputsDir = this.root + '/' + id + '/outputs';
        return existsSync(outputsDir) && readdirSync(outputsDir).length > 0;
    }

    stat(id: string) {
        if (this.exists(id)) {
            const outputsDir = this.root + '/' + id + '/outputs';
            const outputs = readdirSync(outputsDir);
            const stat = statSync(outputsDir + '/' + outputs[0]);
            return {
                size: stat.size,
                lastTimeModified: stat.mtimeMs,
            };
        }

        return null;
    }

    path(id: string) {
        const outputsDir = this.root + '/' + id + '/outputs';
        const outputs = readdirSync(outputsDir);
        return outputs.length ? outputsDir + '/' + outputs[0] : null;
    }

    read(id: string) {
        const path = this.path(id);
        return path ? readJsonSync(path) : null;
    }

    async compile(id: any) {
        const activity = this.activities.read(id);
        if (activity == null)
            return null;

        const workspace = this.root + '/' + activity.id;
        ensureDirSync(workspace);

        const inputs = workspace + '/inputs';
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

            writeJsonSync(inputs + '/' + source.id, {
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

        const outputs = workspace + '/outputs';
        if (existsSync(outputs))
            rmSync(outputs, { recursive: true });


        const compiler = exec(
            // navigate into COMPILER_WORKSPACE
            `cd ${await this.config.get('COMPILER_WORKSPACE')} && ` +
            // then run the compiler (prefix inputs/outputs path with '../' since we are one level deeper in root)
            `java -jar ${await this.config.get('COMPILER_JAR_NAME')} "../${inputs}" "../${outputs}"`
        );

        return {
            code: compiler.code,
            stdout: compiler.stdout,
            stderr: compiler.stderr,
        };
    }

    indentLevel(line: string) {
        line = line.replace(/^(\s+).*$/, "$1");
        var spaces = line.length - line.replace(/[ ]/g, "").length;
        var tabs = line.length - line.replace(/\t/g, "").length;
        return tabs || Math.floor(spaces / 4);
    }
}
