import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { GptGenexplanationComponent } from './gpt-genexplanation.component';

@NgModule({
  declarations: [GptGenexplanationComponent],
  imports: [
    CommonModule,
    FormsModule,
    InputTextareaModule,
    DropdownModule,
    ButtonModule,
  ],
  exports: [GptGenexplanationComponent],
})
export class GptGenexplanationModule {}
