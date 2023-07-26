import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { GptGenexplanationsComponent } from './gpt-genexplanations.component';

@NgModule({
  declarations: [GptGenexplanationsComponent],
  imports: [
    CommonModule,
    FormsModule,
    InputTextareaModule,
    DropdownModule,
    ButtonModule,
  ],
  exports: [GptGenexplanationsComponent],
})
export class GptGenexplanationsModule {}
