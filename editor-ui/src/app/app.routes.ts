import { Routes } from '@angular/router';
import { AuthenticatedAuthorGuard } from './auth-guards/authenticated-author.guard';
import { HandshakeGuard } from './auth-guards/handshake.guard';
import { AppAdminGuard } from './auth-guards/app-admin.guard';
import { PublicGuard } from './auth-guards/public.guard';

export const routes: Routes = [
    {
        path: 'unauthorized',
        loadChildren: () => import('./unauthorized-page/unauthorized-page.module').then(m => m.UnauthorizedPageModule)
    },
    {
        path: 'sources',
        loadChildren: () => import('./sources/sources.module').then(m => m.SourcesModule),
        canActivate: [AuthenticatedAuthorGuard]
    },
    {
        path: 'activities',
        loadChildren: () => import('./activities/activities.module').then(m => m.ActivitiesModule),
        canActivate: [AuthenticatedAuthorGuard]
    },
    {
        path: 'editor/:id',
        loadChildren: () => import('./editor/editor.module').then(m => m.EditorModule),
        canActivate: [AuthenticatedAuthorGuard]
    },
    // {
    //   path: 'viewer/:id',
    //   loadChildren: () => import('./viewer/viewer.module').then(m => m.ViewerModule),
    //   canActivate: [HandshakeGuard]
    // },
    {
        path: 'hub',
        loadChildren: () => import('./hub/hub.module').then(m => m.HubModule),
        canActivate: [HandshakeGuard]
    },
    {
        path: 'user-admin',
        loadChildren: () => import('./user-admin/user-admin.module').then(m => m.UserAdminModule),
        canActivate: [AppAdminGuard]
    },
    {
        path: 'login',
        loadChildren: () => import('./login/login.module').then(m => m.LoginModule),
        canActivate: [PublicGuard]
    },
    {
        path: 'register',
        loadChildren: () => import('./register/register.module').then(m => m.RegisterModule),
        canActivate: [PublicGuard]
    },
    {
        path: 'update-password',
        loadChildren: () => import('./update-password/update-password.module').then(m => m.UpdatePasswordModule),
        canActivate: [HandshakeGuard]
    },
    { path: '**', redirectTo: 'hub' }
];
