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

  constructor(
    private ngZone: NgZone,
    private activities: ActivitiesService,
    private api: SourcesService,
    private router: Router,
    private route: ActivatedRoute,
    private title: Title,
    private app: AppService
  ) { }

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
      },
      (error: any) => console.log(error)
    );
  }

  updateTitle() {
    this.title.setTitle(`PCEX Authoring: ${this.model.name}`);
  }

  setupSourceEditor(editor: any) {
    this.editor = editor;

    editor.onDidChangeCursorPosition((e: any) => {
      this.ngZone.run(() => this.selectLineNum(e.position.lineNumber));
    });

    this.reloadLineMarkers();
  }

  setupDistractorEditor(editor: any) {
    this.setupAsSingleLineEditor(editor);
  }

  setupVariationEditor(editor: any, lineNum: number) {
    this.setupAsSingleLineEditor(editor);

    editor.onDidFocusEditorWidget((e: any) => {
      this.ngZone.run(() => {
        this.editor.setPosition({ lineNumber: lineNum, column: 1 });
        this.editor.revealPosition({ lineNumber: lineNum, column: 1 });
      });
    });
  }

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
  }

  toggleBlankLine() {
    this.selectedLine.blank = !this.selectedLine.blank;
    this.reloadLineMarkers();
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
    const createRange = (ln: any) => ({
      range: new Range(
        parseInt(ln),
        1,
        parseInt(ln),
        clines[ln - 1].length + 1
      ),
      options: {
        isWholeLine: true,
        className: 'marked-line--background',
        glyphMarginClassName: this.model.lines[ln].blank
          ? 'marked-line--glyph'
          : '',
        stickiness: 1,
      },
    });

    const mlines = Object.keys(this.model.lines)
      .map((ln) => parseInt(ln))
      .filter((ln) => ln <= clines.length);

    this.blankLineNums = mlines.filter((ln) => this.model.lines[ln].blank);

    const decorations: any[] = mlines
      .filter((ln) => {
        const line = this.model.lines[ln];
        return line.blank || line.comments.filter(($: any) => $.content).length;
      })
      .map(createRange);

    if (lineNum)
      decorations.push({
        range: new Range(lineNum, 1, lineNum, 1),
        options: { isWholeLine: true, className: 'current-line--customized' },
      });

    this.decorations = this.editor.deltaDecorations([], decorations);
  }

  removeLine(ln: any) {
    if (confirm('Are you sure?')) {
      this.selectedLine.comments = [];
      this.reloadLineMarkers();
    }
  }

  addLineComment() {
    this.selectedLine.comments.push({});
  }

  removeLineComment(comment: any) {
    this.selectedLine.comments.splice(
      this.selectedLine.comments.indexOf(comment),
      1
    );
  }

  addVariation() {
    const clines = this.model.code.split('\n');
    const lines: any = {};
    Object.keys(this.model.lines)
      .map((ln) => parseInt(ln))
      .filter((ln) => this.model.lines[ln].blank)
      .forEach((ln) => (lines[ln] = { code: clines[ln - 1], description: '' }));
    this.model.variations.push({ lines, output: '' });
  }

  removeVariation(variation: any) {
    this.model.variations.splice(this.model.variations.indexOf(variation), 1);
  }

  back() {
    this.router.navigate(['/sources']);
  }

  update() {
    this.ignoreUntouchedLines();
    this.api.update(this.model).subscribe(
      (source: any) => this.router.navigate(['/sources']),
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
        comments: explanations[`${lineNum}`] //
          .map((content: any) => ({ content })),
      };
    });
    this.selectLineNum(Math.min(...lineNums));
  }
  // gptGenExplanationCompleted($event: any) {
  //   console.log($event);
  // }
  // gptGenExplanationsCompleted($event: any) {
  //   console.log($event);
  // }
}

// - the id used for inserting the queries (should be check - avoid overwrite)
// - execute all queries in a transaction
