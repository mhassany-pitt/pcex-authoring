import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnInit,
  Output,
} from '@angular/core';
import { Range } from 'monaco-editor';
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

  prompt: any = {
    inclusion: 'Also include lines that handles input/ouput.',
    exclusion:
      'But ignore main class and method definitions, ' +
      'common import statements and java comments.',
    explanation:
      'When considering each identified line, ' +
      'ensure explanations provide the reasons that led to the line inclusion, ' +
      'prioritizing them based on their relative importance ' +
      'while also preventing any unnecessary duplication or repetition of information.',
  };

  editor: any;
  decorations: any[] = [];

  history: any[] = [];
  lnsExplanations: any;
  lnExplanations: any;
  ln: any;

  generating = false;
  tt: any = {};

  constructor(private ngZone: NgZone, private http: HttpClient) {}

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
    this.generating = true;
    const payload = {
      id: this.sourceId,
      description: this.description,
      source: this.source,
      prompt: this.prompt,
    };
    this.http
      .post(`${environment.apiUrl}/gpt-genai`, payload, {
        withCredentials: true,
      })
      .subscribe(
        (resp: any) => {
          this.generating = false;
          this.history.push(resp);
          const explanations: any = {};
          resp.forEach(
            (line: any) => (explanations[line.line_num] = line.explanations)
          );
          this.lnsExplanations = explanations;
          this.preview();
        },
        (err) => {
          this.generating = false;
          console.log(err);
        }
      );
  }

  preview() {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const clines = this.source.split('\n');
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

    const lines = Object.keys(this.lnsExplanations).map((ln) => parseInt(ln));
    this.decorations = this.editor.deltaDecorations([], lines.map(createRange));
    const line = clines[lines[0] - 1];
    const column = line.indexOf(`${line.trim().charAt(0)}`) + 1;
    this.editor.revealLinesInCenter(lines[0], column);
    this.editor.setPosition({ lineNumber: lines[0], column });
    this.editor.focus();
  }

  selectLineNum(ln: any) {
    this.ln = ln;
    this.lnExplanations =
      this.lnsExplanations && ln in this.lnsExplanations
        ? this.lnsExplanations[ln]
        : null;
  }

  useExplanations() {
    this.complete.emit(this.lnsExplanations);
  }
}
