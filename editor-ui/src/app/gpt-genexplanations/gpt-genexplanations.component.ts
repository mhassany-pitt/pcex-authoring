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

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  generate() {
    this.lnExplanations = [];
    for (let i = 0; i < 20 + Math.random() * 5; i++)
      this.lnExplanations.push(`Explanation ${i + 1}`);
  }

  useExplanations() {
    this.complete.emit(this.lnExplanations);
  }
}
