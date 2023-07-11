import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UpdatePasswordRoutingModule } from './update-password.routing.module';
import { UpdatePasswordComponent } from './update-password.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  declarations: [
    UpdatePasswordComponent
  ],
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    UpdatePasswordRoutingModule
  ]
})
export class UpdatePasswordModule { }
