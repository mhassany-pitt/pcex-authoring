import { Range } from 'monaco-editor';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, NgZone, OnInit, Output } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-gpt-genall',
  templateUrl: './gpt-genall.component.html',
  styleUrls: ['./gpt-genall.component.less'],
})
export class GptGenallComponent implements OnInit {
  @Input() sourceId: string = '';
  @Input() description: string = '';
  @Input() source: string = '';
  @Input() language: string = '';
  @Output() complete = new EventEmitter();
  @Output() log = new EventEmitter();

  editorOptions = {
    language: 'java', // overwritten in ngOnInit
    theme: 'vs', // vs-dark
    minimap: { enabled: false },
    lineNumbersMinChars: 2,
    folding: false,
    glyphMargin: true,
    trimAutoWhitespace: false,
    tabSize: 4,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly: true,
  };

  prompt: any = {
    inclusion: '',
    exclusion: '',
    explanation:
      'When considering each identified line, ' +
      'ensure explanations provide the reasons that led to the line inclusion, ' +
      'prioritizing them based on their relative importance ' +
      'while also preventing any unnecessary duplication or repetition of information.',
  };

  defInclusion = 'Also include lines that ...';
  defExclusion = 'But exclude lines that ...';

  ready = false;
  editor: any;
  decorations: any[] = [];

  history: any[] = [];
  lnsExplanations: any;
  lnExplanations: any;
  ln: any;

  generating = false;
  tt: any = {};

  // logger stuff
  lastValue: any = null;
  curLogSessionId = Math.random().toString(36).substring(2, 15);
  log$(type: string, event: any = {}) { this.log.emit({ session: this.curLogSessionId, type, ...event }); }
  // --- end logger stuff

  constructor(private ngZone: NgZone, private http: HttpClient) { }

  ngOnInit(): void {
    this.editorOptions.language = this.language.toLowerCase();
    this.ready = true;
  }

  setupEditor(editor: any) {
    this.editor = editor;
    const messageContribution = editor.getContribution('editor.contrib.messageController');
    editor.onDidAttemptReadOnlyEdit(() => messageContribution.dispose());

    editor.onDidChangeCursorPosition((e: any) => this.ngZone.run(() => {
      if (e.reason == 3 /* mouse */ && this.ln != e.position.lineNumber) {
        this.selectLineNum(e.position.lineNumber);
      }
    }));
    editor.onMouseDown(($event: any) => {
      if ($event.target.type == 2 && this.ln != $event.target.position.lineNumber) {
        this.selectLineNum($event.target.position.lineNumber);
      }
    });
  }

  generate() {
    this.log$('genexps-generate');

    this.generating = true;
    this.http.post(
      `${environment.apiUrl}/gpt-genai`,
      {
        id: this.sourceId,
        description: this.description,
        source: this.source,
        prompt: this.prompt,
        language: this.language,
      },
      { withCredentials: true }
    ).subscribe(
      (resp: any) => {
        this.generating = false;
        this.history.push(resp);
        const explanations: any = {};
        resp.forEach((line: any) => (explanations[line.line_num] = line.explanations));
        this.lnsExplanations = explanations;
        this.reloadLineMarkers();

        this.log$('genexps-generated', { value: explanations });
      },
      (err) => {
        this.generating = false;
        console.log(err);
      }
    );
  }

  reloadLineMarkers(lineNum?: number) {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const clines = this.source.split('\n');
    const createRange = (ln: any) => ({
      range: new Range(parseInt(ln), 1, parseInt(ln), clines[ln - 1].length + 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: `${this.tt[ln + '-all'] ? 'annotated-line__glyph--excluded' : 'annotated-line__glyph--commented'}`,
        stickiness: 1,
      },
    });

    const mlines = Object.keys(this.lnsExplanations || {}).map((ln) => parseInt(ln));
    const lines: any[] = mlines.map(createRange);
    lineNum = lineNum || mlines[0];

    if (lineNum)
      lines.push({
        range: new Range(lineNum, 1, lineNum, 1),
        options: { isWholeLine: true, className: 'current-line--customized' },
      });

    this.decorations = this.editor.deltaDecorations([], lines);

    const line = clines[lineNum - 1];
    const column = line.indexOf(`${line.trim().charAt(0)}`) + 1;
    this.editor.revealLinesInCenter(lineNum, column);
    this.editor.setPosition({ lineNumber: lineNum, column });
    this.editor.focus();
  }

  selectLineNum(ln: any) {
    this.ln = ln;
    this.lnExplanations =
      this.lnsExplanations && ln in this.lnsExplanations
        ? this.lnsExplanations[ln]
        : null;
    this.reloadLineMarkers(ln);

    this.log$('genexps-select-line', { line_num: ln });
  }

  toggleLineExclusion(ln: any) {
    this.tt[ln + '-all'] = !this.tt[ln + '-all'];
    for (let i = 0; i < this.lnsExplanations[ln].length; i++)
      this.tt[ln + '-' + i] = this.tt[ln + '-all'];
    this.reloadLineMarkers(ln);

    this.log$(this.tt[ln + '-all'] ? 'genexps-exclude-line' : 'genexps-include-line', {
      line_num: ln,
      explanations: this.lnsExplanations[ln]
    });
  }

  toggleExplanationExclusion(ln: any, i: any) {
    this.tt[ln + '-' + i] = !this.tt[ln + '-' + i];

    this.log$(this.tt[ln + '-' + i] ? 'genexps-exclude-explanation' : 'genexps-include-explanation', {
      line_num: ln,
      index: i,
      explanation: this.lnsExplanations[ln][i],
    });
  }

  toggleExplanationLike(ln: any, i: any) {
    this.tt[ln + '-' + i + '-liked'] = !this.tt[ln + '-' + i + '-liked'];

    this.log$('genexps-like-explanation', {
      line_num: ln,
      value: this.tt[ln + '-' + i + '-liked'],
      index: i,
      explanation: this.lnsExplanations[ln][i],
    });
  }

  useExplanations() {
    const explanations = this.lnsExplanations;
    const filtered = Object.keys(explanations)
      .filter(ln => !this.tt[ln + '-all'])
      .reduce((obj, ln) => {
        obj[ln] = explanations[ln].filter((exp: any, i: any) => !this.tt[ln + '-' + i]);
        return obj;
      }, {} as any);
    this.complete.emit(filtered);
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
