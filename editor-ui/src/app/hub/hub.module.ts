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
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ChipsModule } from 'primeng/chips';
import { MenuModule } from 'primeng/menu';
import { NavbarComponent } from '../navbar/navbar.component';

@NgModule({
  declarations: [
    HubComponent
  ],
  imports: [
    CommonModule, FormsModule,
    HubRoutingModule, TagModule,
    DialogModule, ButtonModule,
    InputTextModule, TableModule,
    DropdownModule, SelectButtonModule,
    CheckboxModule, ToastModule,
    ChipsModule,
    MenuModule, NavbarComponent,
  ],
  providers: [
    MessageService,
  ]
})
export class HubModule { }
