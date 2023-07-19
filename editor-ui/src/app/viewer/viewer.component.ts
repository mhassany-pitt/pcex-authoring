import { Component, NgZone, OnInit } from '@angular/core';
import { SourcesService } from '../sources.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Range } from 'monaco-editor';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.less']
})
export class ViewerComponent implements OnInit {

  langSet = false;
  editorOptions = {
    language: 'java',
    theme: 'vs',
    minimap: { enabled: false },
    lineNumbersMinChars: 2,
    folding: false,
    glyphMargin: true,
    trimAutoWhitespace: false,
    tabSize: 4,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly: true,
    readOnlyMessage: {
      value: 'This is a read-only preview of the source code. To edit the source code, click the "Edit" button.',
    }
  };

  model: any;
  editor: any;
  decorations: any[] = [];

  explaining = false;
  lineNums: number[] = [];
  selectedLine: any;
  explanationIdx = 0;
  explanationSubIdx = 0;

  constructor(
    private ngZone: NgZone,
    private api: SourcesService,
    private router: Router,
    private route: ActivatedRoute,
    private title: Title,
  ) { }

  ngOnInit(): void {
    const params: any = this.route.snapshot.params;
    this.api.read(params.id).subscribe(
      (source: any) => {
        source.variations = source.variations || [];
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

  setupEditor(editor: any) {
    this.editor = editor;

    const messageContribution = editor.getContribution("editor.contrib.messageController");
    editor.onDidAttemptReadOnlyEdit(() => messageContribution.dispose());

    // explain the line when clicked on the '?' glyph
    editor.onMouseDown(($event: any) => this.ngZone.run(() => {
      const lineNum = $event.target.position.lineNumber;
      if ($event.target.type == 2 && this.lineNums.includes(lineNum))
        this.explain(lineNum);
    }));

    setTimeout(() => this.reloadLineMarkers(), 0);
  }

  // show current and marked/blank lines
  reloadLineMarkers(lineNum?: number) {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const codeLines = this.model.code?.split('\n');
    const createRange = (ln: any) => ({
      range: new Range(parseInt(ln), 1, parseInt(ln), codeLines[ln - 1].length + 1),
      options: {
        isWholeLine: true,
        className: this.selectLine == ln ? 'marked-line--background' : '',
        glyphMarginClassName: 'marked-line--glyph',
        stickiness: 1,
      }
    });

    this.lineNums = Object.keys(this.model.lines || {})
      .map(ln => parseInt(ln))
      .filter(ln => ln <= codeLines.length);

    const decorations: any[] = this.lineNums.filter(ln => {
      const line = this.model.lines[ln];
      return (line.blank || line.comments.filter(($: any) => $.content).length);
    }).map(createRange);

    if (lineNum) decorations.push({
      range: new Range(lineNum, 1, lineNum, 1),
      options: { isWholeLine: true, className: 'current-line--customized' }
    });

    this.decorations = this.editor.deltaDecorations([], decorations);
  }

  selectLine(lineNum: number, skipScrollTo?: boolean) {
    this.reloadLineMarkers(lineNum);

    this.selectedLine = this.model.lines[lineNum];
    if (!skipScrollTo)
      this.editor.revealLinesInCenter(lineNum, lineNum);
  }

  explain(lineNum?: number) {
    this.explaining = true;
    this.explanationIdx = lineNum ? this.lineNums.indexOf(lineNum) : 0;
    this.explanationSubIdx = 0;

    this.selectLine(lineNum || this.lineNums[0], !!lineNum);
  }

  setExplanationIdx(alpha: number) {
    this.explanationIdx = Math.max(0, Math.min(
      this.explanationIdx + alpha,
      Object.keys(this.model.lines || {}).length - 1
    ));
    this.explanationSubIdx = 0;

    this.selectLine(this.lineNums[this.explanationIdx]);
  }

  setExplanationSubIdx(alpha: number) {
    this.explanationSubIdx = Math.max(0, Math.min(
      this.explanationSubIdx + alpha,
      this.model.lines[this.lineNums[this.explanationIdx]].comments.length - 1
    ));
  }

  changeLang() {
    let filename = this.model.filename || '.java';
    if (!filename.includes('.'))
      filename += '.java';

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

    this.editorOptions.language = editorLang;

    this.langSet = false;
    setTimeout(() => this.langSet = true, 0);
  }
}
