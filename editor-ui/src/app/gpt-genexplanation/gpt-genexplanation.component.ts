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
    this.lnExplanation = Math.random().toString(36).substring(2, 15);
  }

  useExplanation() {
    this.complete.emit(this.explanation);
  }
}
