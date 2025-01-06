import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SourcesRoutingModule } from './sources.routing.module';
import { SourcesComponent } from './sources.component';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@NgModule({
  declarations: [
    SourcesComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    SourcesRoutingModule,
    UserAuthCtrlModule,
    TableModule, DialogModule,
    InputTextModule, ButtonModule,
    CheckboxModule, DropdownModule,
    ConfirmDialogModule,
  ],
  providers: [
    ConfirmationService
  ]
})
export class SourcesModule { }
