import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RegisterRoutingModule } from './register.routing.module';
import { RegisterComponent } from './register.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  declarations: [
    RegisterComponent
  ],
  imports: [
    CommonModule,
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    RegisterRoutingModule,
  ]
})
export class RegisterModule { }
