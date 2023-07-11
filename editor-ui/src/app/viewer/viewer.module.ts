import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ViewerRoutingModule } from './viewer.routing.module';
import { ViewerComponent } from './viewer.component';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { ButtonModule } from 'primeng/button';

@NgModule({
  declarations: [
    ViewerComponent
  ],
  imports: [
    CommonModule, FormsModule,
    ViewerRoutingModule,
    MonacoEditorModule,
    ButtonModule,
  ]
})
export class ViewerModule { }
