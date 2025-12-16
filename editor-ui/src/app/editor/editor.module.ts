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
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ChipsModule } from 'primeng/chips';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { registerAssemblyLanguage } from './editor.asm.support';

@NgModule({
  declarations: [
    EditorComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    EditorRoutingModule,
    MonacoEditorModule.forRoot({
      onMonacoLoad: () => registerAssemblyLanguage((window as any).monaco),
    }),
    InputTextModule, ChipsModule,
    InputTextareaModule, DialogModule,
    CheckboxModule, ButtonModule,
    TabViewModule, SelectButtonModule,
    MenuModule, DropdownModule, OverlayPanelModule,
    ConfirmDialogModule, ToastModule,
    InputGroupModule, InputGroupAddonModule,
  ],
  providers: [
    ConfirmationService, MessageService,
  ]
})
export class EditorModule { }
