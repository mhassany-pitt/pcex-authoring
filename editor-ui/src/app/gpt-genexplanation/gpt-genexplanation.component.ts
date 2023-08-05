import {
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnInit,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-gpt-genexplanation',
  templateUrl: './gpt-genexplanation.component.html',
  styleUrls: ['./gpt-genexplanation.component.less'],
})
export class GptGenexplanationComponent implements OnInit {
  @Input() explanation: string = '';
  @Output() complete = new EventEmitter();

  lnPropmpt: any = '';
  lnExplanation: any = '';

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  generate() {
    this.lnExplanation =
      'The while loop (line 9) ensures that the program handles all the test cases provided as input, allowing the solution to process multiple test cases effectively.';
  }

  useExplanation() {
    this.complete.emit(this.explanation);
  }
}
