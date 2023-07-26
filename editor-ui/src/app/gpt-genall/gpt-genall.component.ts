import {
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnInit,
  Output,
} from '@angular/core';
import { Range } from 'monaco-editor';

@Component({
  selector: 'app-gpt-genall',
  templateUrl: './gpt-genall.component.html',
  styleUrls: ['./gpt-genall.component.less'],
})
export class GptGenallComponent implements OnInit {
  @Input() code: string = '';
  @Output() complete = new EventEmitter();

  editorOptions = {
    language: 'java',
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

  lnSelectPrompt: any = '';
  eachLnPropmpt: any = '';
  lnExplanationCount: string = 'a';

  editor: any;
  decorations: any[] = [];

  lnsExplanations: any;
  lnExplanations: any;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  setupEditor(editor: any) {
    this.editor = editor;
    const messageContribution = editor.getContribution(
      'editor.contrib.messageController'
    );
    editor.onDidAttemptReadOnlyEdit(() => messageContribution.dispose());

    editor.onDidChangeCursorPosition((e: any) => {
      this.ngZone.run(() => this.selectLineNum(e.position.lineNumber));
    });
  }

  generate() {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const clines = this.code.split('\n');
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
        stickiness: 1,
      },
    });

    const lines = clines
      .map((ln, i) => i + 1)
      .filter((ln) => Math.random() < 0.125);

    this.lnsExplanations = {};
    lines.forEach((ln) => {
      this.lnsExplanations[ln] = [];
      for (let i = 0; i < 20 + Math.random() * 5; i++)
        this.lnsExplanations[ln].push(`Explanation ${i + 1} for line ${ln}`);
    });

    this.decorations = this.editor.deltaDecorations([], lines.map(createRange));
    this.editor.revealLinesInCenter(lines[0], lines[0]);
    this.editor.setPosition({ lineNumber: lines[0], column: 0 });
  }

  selectLineNum(ln: any) {
    this.lnExplanations =
      this.lnsExplanations && ln in this.lnsExplanations
        ? this.lnsExplanations[ln]
        : null;
  }

  useExplanations() {
    this.complete.emit(this.lnsExplanations);
  }
}
