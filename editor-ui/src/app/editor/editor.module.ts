import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EditorRoutingModule } from './editor.routing.module';
import { EditorComponent } from './editor.component';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { GptGenallModule } from '../gpt-genall/gpt-genall.module';
import { GptGenexplanationsModule } from '../gpt-genexplanations/gpt-genexplanations.module';
import { GptGenexplanationModule } from '../gpt-genexplanation/gpt-genexplanation.module';

@NgModule({
  declarations: [
    EditorComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    EditorRoutingModule,
    MonacoEditorModule, InputTextModule,
    InputTextareaModule, DialogModule,
    CheckboxModule, ButtonModule,
    TabViewModule, SelectButtonModule,
    GptGenallModule, GptGenexplanationsModule,
    GptGenexplanationModule,
  ]
})
export class EditorModule { }
