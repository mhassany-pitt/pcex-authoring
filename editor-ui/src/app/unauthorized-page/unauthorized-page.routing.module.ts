import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UnauthorizedPageComponent } from './unauthorized-page.component';

const routes: Routes = [
  { path: '', component: UnauthorizedPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UnauthorizedPageRoutingModule { }
