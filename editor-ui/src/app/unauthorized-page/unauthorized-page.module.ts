import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UnauthorizedPageRoutingModule } from './unauthorized-page.routing.module';
import { UnauthorizedPageComponent } from './unauthorized-page.component';

@NgModule({
  declarations: [
    UnauthorizedPageComponent
  ],
  imports: [
    CommonModule,
    UnauthorizedPageRoutingModule
  ]
})
export class UnauthorizedPageModule { }
