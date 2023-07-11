import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app.routing';
import { AppComponent } from './app.component';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { SourcesService } from './sources.service';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ActivitiesService } from './activities.service';
import { CompilerService } from './compiler.service';
import { DialogModule } from 'primeng/dialog';
import { AuthenticatedAuthorGuard } from './auth-guards/authenticated-author.guard';
import { AppAdminGuard } from './auth-guards/app-admin.guard';
import { AuthenticatedGuard } from './auth-guards/authenticated.guard';
import { PublicGuard } from './auth-guards/public.guard';
import { HandshakeGuard } from './auth-guards/handshake.guard';
import { AppService } from './app.service';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    MonacoEditorModule.forRoot(),
    LoadingBarRouterModule,
    LoadingBarHttpClientModule,
    CommonModule, HttpClientModule, RouterModule,
    FormsModule, ButtonModule, AccordionModule, TableModule,
    InputTextModule, DialogModule, InputTextareaModule,
    CheckboxModule, DropdownModule, SelectButtonModule,
    AutoCompleteModule,
  ],
  providers: [
    AppService,
    SourcesService, ActivitiesService, CompilerService,
    AuthenticatedAuthorGuard, HandshakeGuard,
    AppAdminGuard, AuthenticatedGuard, PublicGuard,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
