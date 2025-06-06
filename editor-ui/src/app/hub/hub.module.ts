import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HubRoutingModule } from './hub.routing.module';
import { HubComponent } from './hub.component';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@NgModule({
  declarations: [
    HubComponent
  ],
  imports: [
    CommonModule, FormsModule,
    HubRoutingModule,
    DialogModule, ButtonModule,
    InputTextModule, TableModule,
    DropdownModule, SelectButtonModule,
    CheckboxModule, ToastModule,
    UserAuthCtrlModule,
  ],
  providers: [
    MessageService,
  ]
})
export class HubModule { }
