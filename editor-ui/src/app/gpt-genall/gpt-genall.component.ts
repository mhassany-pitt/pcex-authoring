import { Range } from 'monaco-editor';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, NgZone, OnInit, Output } from '@angular/core';
import { environment } from 'src/environments/environment';
import { arrayMoveMutable } from 'array-move';

@Component({
  selector: 'app-gpt-genall',
  templateUrl: './gpt-genall.component.html',
  styleUrls: ['./gpt-genall.component.less'],
})
export class GptGenallComponent implements OnInit {

  @Input() sourceId: string = '';
  @Input() params: any = { language: '', description: '', source: '' };
  @Output() complete = new EventEmitter();
  @Output() log = new EventEmitter();

  defInclusion = 'Also include lines that ...';
  defExclusion = 'But exclude lines that ...';
  defPrompt = {
    inclusion: '',
    exclusion: '',
    explanation: 'When considering each identified line, ' +
      'ensure explanations provide the reasons that led to the line inclusion, ' +
      'prioritizing them based on their relative importance ' +
      'while also preventing any unnecessary duplication or repetition of information.',
  };

  prompt: any = JSON.parse(JSON.stringify(this.defPrompt));

  editorOptions = {
    language: 'java', // overwritten in ngOnInit
    theme: 'vs',
    minimap: { enabled: false },
    lineNumbersMinChars: 2,
    folding: false,
    glyphMargin: true,
    trimAutoWhitespace: false,
    tabSize: 4,
    scrollBeyondLastLine: false,
    automaticLayout: true
  };

  editor: any;
  decorations: any[] = [];

  history: any[] = [];
  historyRaws: any = {};
  historyTimestamp: any;
  allExplanations: any;
  lineExplanations: any;
  lineNum: any;

  dragEnabled = false;
  dragOverIndex: any;

  generating = false;
  toggles: any = {};

  // logger stuff
  lastValue: any = null;
  curLogSessionId = Math.random().toString(36).substring(2, 15);
  log$(type: string, event: any = {}) {
    this.log.emit({ session: this.curLogSessionId, type, ...event });
  }
  // --- end logger stuff

  constructor(private ngZone: NgZone, private http: HttpClient) { }

  ngOnInit(): void {
    this.editorOptions.language = this.params.language.toLowerCase();
    this.reloadHistory();
  }

  setupEditor(editor: any) {
    this.editor = editor;
    // const messageContribution = editor.getContribution('editor.contrib.messageController');
    // editor.onDidAttemptReadOnlyEdit(() => messageContribution.dispose());

    editor.onDidFocusEditorText((e: any) => {
      this.lastValue = this.params.source;
      this.log$('genexps-editor-focus', { content: this.params.source });
    });
    editor.onDidBlurEditorText((e: any) => {
      this.log$('genexps-editor-blur', { prev_content: this.lastValue, content: this.params.source });
    });

    editor.onDidChangeCursorPosition((e: any) => this.ngZone.run(() => {
      if (this.lineNum != e.position.lineNumber) {
        this.selectLineNum(e.position.lineNumber, false);
      }
    }));
    editor.onMouseDown(($event: any) => {
      if ($event.target.type == 2 && this.lineNum != $event.target.position.lineNumber) {
        this.selectLineNum($event.target.position.lineNumber);
      }
    });

    if (this.lineNum || this.allExplanations) setTimeout(() => {
      this.selectLineNum(this.lineNum || Math.min(...Object.keys(this.allExplanations).map((ln) => parseInt(ln))));
    }, 50);
  }

  reloadHistory(payload?: any) {
    this.log$('genexps-reload-history');
    this.http.get(
      `${environment.apiUrl}/gpt-genai/${this.sourceId}`,
      { withCredentials: true }
    ).subscribe(
      (resp: any) => {
        this.log$('genexps-history-reloaded', { value: resp });
        this.history = resp;
        if (payload) {
          payload.explanations = this.transform(payload.explanations);
          this.historyRaws[resp[0]] = payload;
          this.loadHistory(resp[0]);
        }
      },
      (err) => console.log(err)
    );
  }

  loadHistory(timestamp: string) {
    if (timestamp in this.historyRaws) {
      this.historyTimestamp = timestamp;
      this.useHistory(this.historyRaws[timestamp]);
    } else {
      this.toggles[timestamp] = 'loading';
      this.http.get(
        `${environment.apiUrl}/gpt-genai/${this.sourceId}/${timestamp}`,
        { withCredentials: true }
      ).subscribe(
        (resp: any) => {
          delete this.toggles[timestamp];
          this.historyTimestamp = timestamp;
          resp.explanations = this.transform(resp.explanations);
          this.historyRaws[timestamp] = resp;
          this.useHistory(this.historyRaws[timestamp]);
        },
        (err) => console.log(err)
      );
    }
  }

  useHistory(payload: any) {
    if (payload.params) {
      this.params = payload.params;
      this.prompt = null; // force render the prompt
      setTimeout(() => this.prompt = payload.params.prompt, 0);
    } else {
      // previously, we did not stored params.
    }
    this.allExplanations = payload.explanations;
    if (this.lineNum || this.allExplanations) setTimeout(() => {
      this.selectLineNum(this.lineNum || Math.min(...Object.keys(this.allExplanations).map((ln) => parseInt(ln))));
    }, 50);

    this.log$('genexps-use-history', { value: payload });
  }

  transform(resp: any) {
    const explanations: any = {};
    resp.forEach((line: any) => {
      explanations[line.line_num] = line.explanations.map((e: string, i: number) => {
        return { id: i, content: e, gpt: e, 'gpt-i': i };
      });
    });
    return explanations;
  }

  generate() {
    this.log$('genexps-generate');
    this.generating = true;
    const params = { id: this.sourceId, ...this.params, prompt: this.prompt };
    this.http.post(
      `${environment.apiUrl}/gpt-genai`,
      params, { withCredentials: true }
    ).subscribe(
      (resp: any) => {
        this.log$('genexps-generated', { value: resp });
        this.generating = false;
        this.reloadHistory({ params, explanations: resp });
      },
      (err) => {
        this.generating = false;
        console.log(err);
      }
    );
  }

  selectLineNum(lineNum: any, reveal = true) {
    this.lineNum = lineNum;
    this.lineExplanations =
      this.allExplanations && lineNum in this.allExplanations
        ? this.allExplanations[lineNum]
        : null;

    if (reveal) {
      const line = this.params.source.split('\n')[lineNum - 1];
      const column = line.indexOf(`${line.trim().charAt(0)}`) + 1;
      this.editor.revealLinesInCenter(lineNum, column);
      this.editor.setPosition({ lineNumber: lineNum, column });
      this.editor.focus();
    }

    this.reloadLineMarkers();
    this.log$('genexps-select-line', { line_num: lineNum });
  }

  reloadLineMarkers() {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const clines = this.params.source.split('\n');
    const createRange = (ln: any) => ({
      range: new Range(parseInt(ln), 1, parseInt(ln), clines[ln - 1].length + 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: `${this.toggles[ln + '-all'] ? 'annotated-line__glyph--excluded' : 'annotated-line__glyph--commented'}`,
        stickiness: 1,
      },
    });

    const mlines = Object.keys(this.allExplanations || {}).map((ln) => parseInt(ln));
    const lines: any[] = mlines.map(createRange);
    this.decorations = this.editor.deltaDecorations([], lines);
  }

  toggleLineExclusion(lineNum: any) {
    this.toggles[lineNum + '-all'] = !this.toggles[lineNum + '-all'];
    for (let i = 0; i < this.allExplanations[lineNum].length; i++)
      this.toggles[lineNum + '-' + i] = this.toggles[lineNum + '-all'];
    this.reloadLineMarkers();

    this.log$('genexps-exclude-line', {
      line_num: lineNum, explanations: this.allExplanations[lineNum],
      value: this.toggles[lineNum + '-all']
    });
  }

  toggleExplanationExclusion(lineNum: any, i: any) {
    this.toggles[lineNum + '-' + i] = !this.toggles[lineNum + '-' + i];

    this.log$('genexps-exclude-explanation', {
      line_num: lineNum, index: i, explanation: this.allExplanations[lineNum][i],
      value: this.toggles[lineNum + '-' + i]
    });

    this.toggles[lineNum + '-all'] = !this.allExplanations[lineNum].some((exp: any) => !this.toggles[lineNum + '-' + exp.id]);
    this.reloadLineMarkers();
  }

  toggleExplanationLike(lineNum: any, i: any) {
    this.toggles[lineNum + '-' + i + '-liked'] = !this.toggles[lineNum + '-' + i + '-liked'];

    this.log$('genexps-like-explanation', {
      line_num: lineNum, index: i, explanation: this.allExplanations[lineNum][i],
      value: this.toggles[lineNum + '-' + i + '-liked'],
    });
  }

  onExplanationDrag($event: any, i: number) {
    if (!this.dragEnabled) return;
    $event.dataTransfer.setData('index', `${i}`);
  }

  onExplanationDragOver($event: any, i: number) {
    if (!this.dragEnabled) return;
    $event.preventDefault();
    $event.dataTransfer.dropEffect = $event.altKey ? 'copy' : 'move';
    this.dragOverIndex = i;
  }

  onExplanationDrop($event: any, i: number) {
    if (!this.dragEnabled) return;
    $event.preventDefault();
    this.dragOverIndex = null;
    const from = parseInt($event.dataTransfer.getData('index'));
    this.log$($event.altKey ? 'genexps-merge-explanation' : 'genexps-reorder-explanation',
      { line_num: this.lineNum, explanations: this.lineExplanations, from, to: i });
    if ($event.altKey) {
      if (from != i) {
        this.lineExplanations[i].content += ' ' + this.lineExplanations[from].content;
        this.lineExplanations[i].gpt += ' ' + this.lineExplanations[from].gpt;
        this.lineExplanations.splice(from, 1);
      }
    } else {
      arrayMoveMutable(this.lineExplanations, from, i);
    }
    this.log$($event.altKey ? 'genexps-explanation-merged' : 'genexps-explanation-reordered',
      { line_num: this.lineNum, explanations: this.lineExplanations, from, to: i });
  }

  onExplanationDragEnd(el: any, $event: any, i: number) {
    el.removeAttribute('draggable');
    this.dragEnabled = false;
  }

  mergeExplanations() {
    this.log$('genexps-merge-explanations',
      { line_num: this.lineNum, explanations: this.lineExplanations });
    if (confirm('Are you sure you want to merge all explanations for this line?')) {
      const merged = this.lineExplanations.map((exp: any) => exp.content).join(' ');
      const gptmerged = this.lineExplanations.map((exp: any) => exp.gpt).join(' ');
      this.lineExplanations[0].content = merged.trim();
      this.lineExplanations[0].gpt = gptmerged.trim();
      this.lineExplanations.splice(1, this.lineExplanations.length - 1);
      this.log$('genexps-explanations-merged',
        { line_num: this.lineNum, explanations: this.lineExplanations });
    }
  }

  removeExplanation(i: number) {
    const content = this.lineExplanations[i].content?.trim();
    this.log$('genexps-remove-explanation',
      { line_num: this.lineNum, index: i, explanations: this.lineExplanations });
    if (!content || confirm('Are you sure you want to remove this explanation?')) {
      this.lineExplanations.splice(i, 1);
      this.log$('genexps-explanation-removed',
        { line_num: this.lineNum, index: i, explanations: this.lineExplanations });
    }
  }

  applyAndUse() {
    const explanations = this.allExplanations;
    const filtered = Object.keys(explanations)
      .filter(ln => !this.toggles[ln + '-all'])
      .reduce((obj, ln) => {
        obj[ln] = explanations[ln]
          .filter((exp: any) => !this.toggles[ln + '-' + exp.id] && exp.content.trim())
          .map((exp: any) => {
            delete exp.id;
            return exp;
          });
        return obj;
      }, {} as any);
    this.complete.emit({ ...this.params, explanations: filtered });
  }

  placeholder(el: any, dflt: string) {
    const content = el.textContent?.trim();
    const content_lower = content?.toLowerCase();
    const defOrEmpty = content_lower == dflt.toLowerCase().trim() || !content_lower;
    el.innerHTML = defOrEmpty ? `<span class="text-gray-400 italic">${dflt}</span>` : content;
    return defOrEmpty ? '' : content;
  }

  onPromptBlur(type: string, el: any) {
    this.log$(type, { prev_value: this.lastValue, value: el.textContent?.trim() });
  }
}
