import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ActivitiesRoutingModule } from './activities.routing.module';
import { ActivitiesComponent } from './activities.component';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ActivityComponent } from './activity/activity.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { UserAuthCtrlModule } from '../user-auth-ctrl/user-auth-ctrl.module';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';

@NgModule({
  declarations: [
    ActivitiesComponent,
    ActivityComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    ActivitiesRoutingModule,
    TableModule, ButtonModule,
    DialogModule, DropdownModule,
    SelectButtonModule, UserAuthCtrlModule,
    InputTextModule, CheckboxModule,
    ConfirmDialogModule, TagModule,
  ],
  providers: [
    ConfirmationService
  ]
})
export class ActivitiesModule { }
