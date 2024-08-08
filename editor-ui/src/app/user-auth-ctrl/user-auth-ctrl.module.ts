import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAuthCtrlComponent } from './user-auth-ctrl.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [UserAuthCtrlComponent],
  imports: [CommonModule, FormsModule, ButtonModule, RouterModule],
  exports: [UserAuthCtrlComponent]
})
export class UserAuthCtrlModule { }
