import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GptGenallComponent } from './gpt-genall.component';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';

@NgModule({
  declarations: [GptGenallComponent],
  imports: [
    CommonModule,
    FormsModule,
    MonacoEditorModule,
    InputTextareaModule,
    DropdownModule,
    ButtonModule,
  ],
  exports: [GptGenallComponent],
})
export class GptGenallModule {}
