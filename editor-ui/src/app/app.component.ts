import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { AppService } from './app.service';
import { DialogModule } from 'primeng/dialog';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AccordionModule } from 'primeng/accordion';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, FormsModule,
    CommonModule, LoadingBarRouterModule,
    LoadingBarHttpClientModule, HttpClientModule,
    FormsModule, ButtonModule, AccordionModule, TableModule,
    InputTextModule, DialogModule, InputTextareaModule,
    CheckboxModule, DropdownModule, SelectButtonModule,
    AutoCompleteModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less'
})
export class AppComponent {

  lastDismissed = 0;
  VERSION = 20251012;

  DOCUMENTATION_URL = 'https://docs.google.com/document/d/1biWaF23Vy7tFpXQE0WDgte3_iaaWfa1MrJxxxs7bpHg';

  constructor(public app: AppService) {
    this.lastDismissed = parseInt(localStorage.getItem('pcex-authoring.update-notice.version') || '0', 10);
  }

  getStorageItem(key: string) {
    return localStorage.getItem(key);
  }

  setStorageItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
}
