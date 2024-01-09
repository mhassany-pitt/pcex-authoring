import { Component } from '@angular/core';
import { AppService } from './app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {

  docUrl = 'https://docs.google.com/document/d/1biWaF23Vy7tFpXQE0WDgte3_iaaWfa1MrJxxxs7bpHg';

  get welcomeMessageDismissed() { return localStorage.getItem('pcex-authoring.welcome') === 'dismissed'; }

  constructor(public app: AppService) { }

  dismissWelcomeMessage() {
    localStorage.setItem('pcex-authoring.welcome', 'dismissed');
  }
}
