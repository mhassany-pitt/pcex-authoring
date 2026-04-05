import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SourcesRoutingModule } from './sources.routing.module';
import { SourcesComponent } from './sources.component';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { NavbarComponent } from '../navbar/navbar.component';

@NgModule({
  declarations: [
    SourcesComponent,
  ],
  imports: [
    CommonModule, FormsModule,
    SourcesRoutingModule,
    TableModule, DialogModule,
    InputTextModule, ButtonModule,
    CheckboxModule, DropdownModule,
    ConfirmDialogModule, TagModule,
    NavbarComponent,
  ],
  providers: [
    ConfirmationService
  ]
})
export class SourcesModule { }
