import {
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnInit,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-gpt-genexplanations',
  templateUrl: './gpt-genexplanations.component.html',
  styleUrls: ['./gpt-genexplanations.component.less'],
})
export class GptGenexplanationsComponent implements OnInit {
  @Input() line: any;
  @Output() complete = new EventEmitter();

  lnPropmpt: any = '';
  lnExplanationCount: string = 'a';

  lnExplanations: any;

  tt: any = {};

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  generate() {
    this.lnExplanations = [
      "This line initiates a while loop that will iterate as long as the variable 'numOfTestCases' is greater than 0.",
      "The line is important because it allows the program to handle multiple test cases efficiently. The variable 'numOfTestCases' represents the number of test cases the program needs to process.",
      "Within each iteration of the loop, the program reads the 'income' value for a particular test case (line 10) and then checks whether it is greater than 100 (line 11). Depending on the condition, it deducts the tax and prints the final money you get (lines 12 and 13). Then, it decrements 'numOfTestCases' to move on to the next test case (line 14). This process continues until all test cases are processed.",
      'By using this loop, the solution can efficiently handle multiple test cases, making it scalable and suitable for real-world scenarios where a large number of inputs need to be processed in one go.',
    ];
  }

  useExplanations() {
    this.complete.emit(this.lnExplanations);
  }
}
