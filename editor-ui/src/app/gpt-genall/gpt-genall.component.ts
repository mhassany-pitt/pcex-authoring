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
  ln: any;

  tt: any = {};

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

    const lines = [7, 8, 9, 10, 11, 12, 13, 14];

    this.lnsExplanations = {
      7: [
        'Create a Scanner object to read input from the standard input stream (keyboard).',
        'This line is important because it allows the program to read user input.',
        'Since the problem statement states that the total income is given as input, we need to read this value to perform calculations.',
        'The Scanner object is used to parse the input data and convert it into the appropriate data type, in this case, an integer.',
      ],
      8: [
        'Read the number of test cases from the input.',
        'This line is important because it determines how many times the subsequent code block will be executed.',
        'The problem states that there are multiple test cases, so we need to know the number of test cases to loop through each one.',
        "The variable 'numOfTestCases' holds the count of test cases, which is later used in the while loop condition (line 9).",
      ],
      9: [
        'Start a loop that will execute as long as there are test cases remaining.',
        'This line is important because it sets up a loop to process each test case one by one.',
        'The loop ensures that the program reads and processes each test case until there are no more left to process.',
        'Since the problem states that there are multiple test cases, the while loop helps iterate through each case.',
      ],
      10: [
        'Read the income value for the current test case.',
        'This line is important because it reads the income value, which is required to calculate the final amount of money received.',
        'Since the problem statement specifies that the total income is given for each test case, we need to read this value.',
        "The variable 'income' holds the total income for the current test case, which is used for further calculations.",
      ],
      11: [
        'Check if the income is strictly greater than 100.',
        'This line is important because it determines whether the tax of rupees 10 will be deducted from the income.',
        'The problem statement states that a tax of rupees 10 is deducted if the total income is strictly greater than 100.',
        'Based on this condition, the program decides whether to subtract the tax amount from the income or not.',
      ],
      12: [
        'Print the amount of money received after deducting the tax.',
        'This line is important because it displays the final amount of money received after deducting the tax (if applicable).',
        'The problem statement requires finding out how much money you get after the tax deduction.',
        "By printing the value of 'income - 10', the program outputs the result for each test case.",
      ],
      13: [
        'Print the income without any tax deduction.',
        'This line is important because it handles the case where the income is not greater than 100.',
        'If the income is 100 or less, there is no tax deduction, so the original income amount should be printed.',
        "By printing 'income' directly, the program outputs the result for the cases where no tax is deducted.",
      ],
      14: [
        'Decrement the number of test cases to keep track of processed cases.',
        'This line is important because it ensures that the loop iterates through each test case.',
        "By decrementing the 'numOfTestCases' variable, the program moves to the next test case in the next iteration of the loop.",
        "Without this line, the loop would become an infinite loop, as 'numOfTestCases' would always remain greater than 0.",
      ],
    };

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
