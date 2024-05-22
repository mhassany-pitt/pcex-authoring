import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { AppService } from './app.service';
import { SourcesService } from './sources.service';
import { ActivitiesService } from './activities.service';
import { AuthenticatedAuthorGuard } from './auth-guards/authenticated-author.guard';
import { HandshakeGuard } from './auth-guards/handshake.guard';
import { AppAdminGuard } from './auth-guards/app-admin.guard';
import { AuthenticatedGuard } from './auth-guards/authenticated.guard';
import { PublicGuard } from './auth-guards/public.guard';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    importProvidersFrom(BrowserAnimationsModule),
    AppService,
    SourcesService, ActivitiesService,
    AuthenticatedAuthorGuard, HandshakeGuard,
    AppAdminGuard, AuthenticatedGuard, PublicGuard,
  ]
};
