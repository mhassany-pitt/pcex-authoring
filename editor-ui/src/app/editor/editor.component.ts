import { Component, Input, NgZone, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { KeyCode, KeyMod, Range } from 'monaco-editor';
import { SourcesService } from '../sources.service';
import { ActivitiesService } from '../activities.service';
import { AppService } from '../app.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.less'],
})
export class EditorComponent implements OnInit {
  @Input() language = 'java';

  srcEditorOptions = {
    language: this.language,
    theme: 'vs', // vs-dark
    minimap: { enabled: false },
    lineNumbersMinChars: 2,
    folding: false,
    glyphMargin: true,
    trimAutoWhitespace: false,
    tabSize: 4,
    scrollBeyondLastLine: false,
    automaticLayout: true,
  };

  distEditorOptions = {
    ...this.srcEditorOptions,
    lineNumbers: 'off',
    lineNumbersMinChars: 0,
    lineDecorationsWidth: 0,
    glyphMargin: false,
    renderLineHighlight: 'none',
    scrollbar: { verticalScrollbarSize: 0 },
  };

  jsonViewerOptions = {
    ...this.srcEditorOptions,
    readOnly: true,
  };

  model: any;

  editor: any;
  selectedLineNum: any;
  selectedLine: any;
  blankLineNums: any[] = [];
  decorations: any[] = [];

  tabHeaders = [
    'Annotations',
    /* 'Variations', */ 'Distractors',
    'Program Input',
  ];
  currentTab = 'Annotations';
  previewLink: any;
  showPreview = false;
  langSet = true;

  get titleDescCollapsed() {
    return localStorage.getItem('pcex.prefs.titleDescCollapsed') == 'true';
  }
  set titleDescCollapsed(value) {
    localStorage.setItem('pcex.prefs.titleDescCollapsed', `${value}`);
  }

  gptGenAll = false;
  gptGenExplanation = false;
  // gptGenExplanation_selectedLine: any;
  // gptGenExplanations = false;
  // gptGenExplanations_selectedExplanation: any;

  dtime0 = Date.now();
  lastValue: any = null;

  constructor(
    private ngZone: NgZone,
    private activities: ActivitiesService,
    private api: SourcesService,
    private router: Router,
    private route: ActivatedRoute,
    private title: Title,
    private app: AppService
  ) { }

  log(event: any) {
    event = { ...event, dtime: Date.now() };
    event.since_dtime0 = event.dtime - this.dtime0;
    let tries = 0;
    const log$ = () => this.api.log(this.model.id, event).subscribe({
      error: (error: any) => {
        console.log(error);
        if (tries++ < 5) {
          setTimeout(log$, tries * 1000);
        }
      },
    });
    log$();
  }

  onExplanationFocus(comment: any, i: number) {
    this.lastValue = comment;

    this.log({
      type: 'explanation-focus',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      index: i,
      value: comment,
    });
  }

  onExplanationBlur(comment: any, i: number) {
    this.log({
      type: 'explanation-blur',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      index: i,
      prev_value: this.lastValue,
      value: comment,
    });
  }

  ngOnInit(): void {
    const params: any = this.route.snapshot.params;
    this.api.read(params.id).subscribe(
      (source: any) => {
        // source.variations = source.variations || [];
        source.lines = source.lines || {};
        source.distractors = source.distractors || [];
        this.model = source;

        this.updateTitle();
        this.changeLang();

        if (this.editor)
          setTimeout(() => this.reloadLineMarkers(), 0);

        this.log({ type: 'loaded' });
      },
      (error: any) => console.log(error)
    );
  }

  updateTitle() {
    this.title.setTitle(`PCEX Authoring: ${this.model.name}`);
  }

  setupSourceEditor(editor: any) {
    this.editor = editor;

    editor.onDidFocusEditorText((e: any) => {
      this.lastValue = this.model.code;
      this.log({ type: 'editor-focus', content: this.model.code });
    });
    editor.onDidBlurEditorText((e: any) => {
      this.log({ type: 'editor-blur', prev_content: this.lastValue, content: this.model.code });
    });

    editor.onDidChangeCursorPosition((e: any) => this.ngZone.run(() => {
      if (e.reason == 3 /* mouse */ && this.selectedLineNum != e.position.lineNumber) {
        this.selectLineNum(e.position.lineNumber);
      }
    }));
    editor.onMouseDown(($event: any) => {
      if ($event.target.type == 2 && this.selectedLineNum != $event.target.position.lineNumber) {
        this.selectLineNum($event.target.position.lineNumber);
      }
    });

    setTimeout(() => this.reloadLineMarkers(), 0);
  }

  setupDistractorEditor(editor: any, distractor: any, i: number) {
    this.setupAsSingleLineEditor(editor);

    editor.onDidFocusEditorText((e: any) => {
      this.lastValue = distractor.code;
      this.log({
        type: 'distractor-focus',
        index: i,
        content: distractor.code
      });
    });
    editor.onDidBlurEditorText((e: any) => {
      this.log({
        type: 'distractor-blur',
        index: i,
        prev_content: this.lastValue,
        content: distractor.code
      });
    });
  }

  // setupVariationEditor(editor: any, lineNum: number) {
  //   this.setupAsSingleLineEditor(editor);

  //   editor.onDidFocusEditorWidget((e: any) => {
  //     this.ngZone.run(() => {
  //       this.editor.setPosition({ lineNumber: lineNum, column: 1 });
  //       this.editor.revealPosition({ lineNumber: lineNum, column: 1 });
  //     });
  //   });
  // }

  private setupAsSingleLineEditor(editor: any) {
    // --------------->>
    // https://github.com/vikyd/vue-monaco-singleline/blob/1de219c2f1ddd89f6b473e43716bbb3dfb662542/src/monaco-singleline.vue#L150
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KEY_F, () => { });
    editor.addCommand(KeyCode.Enter, () =>
      editor.trigger('', 'acceptSelectedSuggestion')
    );
    editor.onDidPaste((e: any) => {
      if (e.endLineNumber <= 1) return;
      let content = '';
      const model = editor.getModel();
      const lc = model.getLineCount();
      for (let i = 0; i < lc; i += 1) content += model.getLineContent(i + 1);
      model.setValue(content);
      editor.setPosition({ column: content.length + 1, lineNumber: 1 });
    });
    editor.addCommand(KeyCode.F1, () => { });
    // <<---------------
  }

  selectLineNum(lineNum: number) {
    this.selectedLineNum = lineNum;

    if (lineNum) {
      // init line with defaults
      if (lineNum in this.model.lines == false)
        this.model.lines[lineNum] = { comments: [{}] };
      this.selectedLine = this.model.lines[lineNum];
    } else {
      this.selectedLine = {};
    }

    this.reloadLineMarkers(lineNum);
    this.log({ type: 'select-line', line_num: lineNum });
  }

  toggleBlankLine() {
    this.selectedLine.blank = !this.selectedLine.blank;
    this.reloadLineMarkers(this.selectedLineNum);
  }

  ignoreUntouchedLines() {
    // remove non-blank or no comments lines
    const lnCount = this.model.code.split('\n').length;
    Object.keys(this.model.lines)
      .filter((ln) => {
        const line = this.model.lines[ln];
        return (
          parseInt(ln) > lnCount ||
          (!line.blank &&
            line.comments.filter((c: any) => c.content).length == 0)
        );
      })
      .forEach((ln) => delete this.model.lines[ln]);
  }

  reloadLineMarkers(lineNum?: number) {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const clines = this.model.code?.split('\n');
    const createRange = (ln: any) => {
      const blank = this.model.lines[ln].blank;
      const commented = this.model.lines[ln].comments.filter((c: any) => c.content).length > 0;
      return {
        range: new Range(parseInt(ln), 1, parseInt(ln), clines[ln - 1].length + 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: `annotated-line__glyph${blank ? '--blank' : ''}${commented ? '--commented' : ''}`,
          stickiness: 1,
        },
      };
    };

    const mlines = Object.keys(this.model.lines).map((ln) => parseInt(ln)).filter((ln) => ln <= clines.length);
    this.blankLineNums = mlines.filter((ln) => this.model.lines[ln].blank);
    const lines: any[] = mlines.map(createRange);
    if (lineNum)
      lines.push({
        range: new Range(lineNum, 1, lineNum, 1),
        options: { isWholeLine: true, className: 'current-line--customized' },
      });

    this.decorations = this.editor.deltaDecorations([], lines);
  }

  removeLine(ln: any) {
    const logpayload = {
      line_num: ln,
      line_content: this.model.code.split('\n')[ln - 1],
      is_blank: this.model.lines[ln].blank,
      explanations: this.model.lines[ln].comments,
    };
    this.log({ type: 'remove-line', ...logpayload });

    if (confirm('Are you sure?')) {
      this.selectedLine.comments = [];
      this.reloadLineMarkers(this.selectedLineNum);

      this.log({ type: 'remove-line-confirmed', ...logpayload });
    } else {
      this.log({ type: 'remove-line-cancelled', ...logpayload });
    }
  }

  addLineComment() {
    this.selectedLine.comments.push({});
    this.reloadLineMarkers(this.selectedLineNum);

    this.log({
      type: 'add-explanation',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.model.lines[this.selectedLineNum].blank,
      explanations: this.model.lines[this.selectedLineNum].comments,
    });
  }

  removeLineComment(comment: any, i: number) {
    this.log({
      type: 'remove-explanation',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.model.lines[this.selectedLineNum].blank,
      explanations: this.model.lines[this.selectedLineNum].comments,
      index: i,
    });

    this.selectedLine.comments.splice(i, 1);
    this.reloadLineMarkers(this.selectedLineNum);
  }

  addDistractor() {
    this.model.distractors.push({ code: '', description: '' });

    this.log({
      type: 'add-distractor',
      distractors: this.model.distractors,
    });
  }

  removeDistractor(distractor: any, i: number) {
    this.log({
      type: 'remove-distractor',
      content: distractor.code,
      description: distractor.description,
      index: i,
    });

    this.model.distractors.splice(i, 1);
  }

  // addVariation() {
  //   const clines = this.model.code.split('\n');
  //   const lines: any = {};
  //   Object.keys(this.model.lines)
  //     .map((ln) => parseInt(ln))
  //     .filter((ln) => this.model.lines[ln].blank)
  //     .forEach((ln) => (lines[ln] = { code: clines[ln - 1], description: '' }));
  //   this.model.variations.push({ lines, output: '' });
  // }

  // removeVariation(variation: any) {
  //   this.model.variations.splice(this.model.variations.indexOf(variation), 1);
  // }

  back() {
    this.router.navigate(['/sources']);
  }

  update() {
    this.ignoreUntouchedLines();
    this.api.update(this.model).subscribe(
      (source: any) => {
        this.log({ type: 'updated' });
        this.router.navigate(['/sources']);
      },
      (error: any) => console.log(error)
    );
  }

  changeLang() {
    let filename = this.model.filename || '.java';
    if (!filename.includes('.')) filename += '.java';

    const extension = `.${filename.split('.').pop()}`;
    const map: any = {
      '.py': 'PYTHON',
      '.java': 'JAVA',
      '.go': 'GO',
      '.cpp': 'CPP',
      '.js': 'JAVASCRIPT',
      '.ts': 'TYPESCRIPT',
      '.php': 'PHP',
      '.c': 'C',
      '.rb': 'RUBY',
      '.cs': 'CSHARP',
      '.rs': 'RUST',
      '.scala': 'SCALA',
      '.kt': 'KOTLIN',
      '.swift': 'SWIFT',
      '.dart': 'DART',
      '.pl': 'PERL',
      '.r': 'R',
    };

    this.model.filename = filename;
    this.model.language = extension in map ? map[extension] : 'unknown';

    const editorLang = this.model.language.toLowerCase();
    this.srcEditorOptions.language = editorLang;
    this.distEditorOptions.language = editorLang;
    this.jsonViewerOptions.language = editorLang;

    this.langSet = false;
    setTimeout(() => (this.langSet = true), 0);
  }

  preview() {
    this.ignoreUntouchedLines();
    const id = this.model.id;
    const items = [{ item$: { ...this.model, id: `${id}_example` }, type: 'example' }];
    const challenge = Object.keys(this.model.lines).filter(ln => this.model.lines[ln].blank);
    if (challenge) items.push({ item$: { ...this.model, id: `${id}_challenge` }, type: 'challenge' });
    this.activities.genPreviewJson(
      { id: this.model.id, name: this.model.name, items },
      'activity'
    ).subscribe(
      (resp: any) => {
        this.previewLink = this.activities.previewJsonLink(
          this.model,
          'activity'
        );
        this.showPreview = true;
      },
      (error: any) => console.log(error)
    );
  }

  gptGenAllCompleted(explanations: any) {
    const lineNums = Object.keys(explanations).map((ln) => parseInt(ln));
    lineNums.forEach((lineNum) => {
      this.model.lines[lineNum] = {
        comments: [
          ...this.model.lines[lineNum].comments,
          ...explanations[`${lineNum}`] //
            .map((content: any) => ({ content, gpt: content }))
        ],
      };
    });
    this.selectLineNum(Math.min(...lineNums));
    this.log({ type: 'use-expgen-explanations', explanations });
  }
  // gptGenExplanationCompleted($event: any) {
  //   console.log($event);
  // }
  // gptGenExplanationsCompleted($event: any) {
  //   console.log($event);
  // }
}
