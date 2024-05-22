import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EditorRoutingModule } from './editor.routing.module';
import { EditorComponent } from './editor.component';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { MenuModule } from 'primeng/menu';

@NgModule({
  declarations: [
    EditorComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    EditorRoutingModule,
    MonacoEditorModule.forRoot(), 
    InputTextModule,
    InputTextareaModule, DialogModule,
    CheckboxModule, ButtonModule,
    TabViewModule, SelectButtonModule,
    MenuModule,
  ]
})
export class EditorModule { }
