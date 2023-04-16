import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app.routing';
import { AppComponent } from './app.component';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { SourcesService } from './sources.service';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SourcesComponent } from './sources/sources.component';
import { ActivitiesComponent } from './activities/activities.component';
import { EditorComponent } from './editor/editor.component';
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
import { ActivityComponent } from './activity/activity.component';
import { ActivitiesService } from './activities.service';
import { CompilerService } from './compiler.service';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    SourcesComponent,
    EditorComponent,
    ActivitiesComponent,
    ActivityComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    MonacoEditorModule.forRoot(),
    LoadingBarRouterModule,
    LoadingBarHttpClientModule,
    CommonModule,
    ButtonModule,
    AccordionModule,
    TableModule,
    InputTextModule,
    DialogModule,
    InputTextareaModule,
    HttpClientModule,
    RouterModule,
    CheckboxModule,
    DropdownModule,
    SelectButtonModule,
    AutoCompleteModule,
  ],
  providers: [SourcesService, ActivitiesService, CompilerService],
  bootstrap: [AppComponent]
})
export class AppModule { }
