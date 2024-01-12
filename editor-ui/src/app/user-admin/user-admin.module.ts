import { Input, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserAdminRoutingModule } from './user-admin.routing.module';
import { UserAdminComponent } from './user-admin.component';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SelectButtonModule } from 'primeng/selectbutton';
import { UserAdminService } from './user-admin.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ChipsModule } from 'primeng/chips';
import { RouterModule } from '@angular/router';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';

@NgModule({
  declarations: [
    UserAdminComponent
  ],
  imports: [
    CommonModule, FormsModule, RouterModule,
    UserAdminRoutingModule,
    UserAuthCtrlModule,
    TableModule, ButtonModule,
    InputTextModule, DialogModule,
    InputTextareaModule, SelectButtonModule,
    SplitButtonModule, MultiSelectModule,
    ConfirmDialogModule, ChipsModule,
  ],
  providers: [UserAdminService, ConfirmationService]
})
export class UserAdminModule { }
