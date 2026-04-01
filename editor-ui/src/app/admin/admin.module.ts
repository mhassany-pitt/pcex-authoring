import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin.routing.module';
import { AdminComponent } from './admin.component';
import { UserAdminComponent } from './user-admin.component';
import { ActivitySourceAdminComponent } from './activity-source-admin.component';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AdminService } from './admin.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ChipsModule } from 'primeng/chips';
import { RouterModule } from '@angular/router';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { DropdownModule } from 'primeng/dropdown';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { OverlayPanelModule } from 'primeng/overlaypanel';

@NgModule({
  declarations: [
    AdminComponent,
    UserAdminComponent,
    ActivitySourceAdminComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AdminRoutingModule,
    UserAuthCtrlModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    InputTextareaModule,
    SelectButtonModule,
    SplitButtonModule,
    MultiSelectModule,
    ConfirmDialogModule,
    ChipsModule,
    DropdownModule,
    TabViewModule,
    CheckboxModule,
    InputGroupModule,
    InputGroupAddonModule,
    OverlayPanelModule,
  ],
  providers: [AdminService, ConfirmationService],
})
export class AdminModule {}
