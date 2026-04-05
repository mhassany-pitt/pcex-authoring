import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AppService } from '../app.service';
import { getNavMenuBar } from '../utilities';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MenuModule],
  templateUrl: './navbar.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    :host ::ng-deep .user-menu .p-menu {
      border-radius: 0.25rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      margin-top: 0.5rem;
    }
    :host ::ng-deep .user-menu .p-menuitem-link .p-menuitem-text {
      font-weight: 700;
      font-size: 0.875rem;
    }
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link span,
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link i,
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link .p-menuitem-text,
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link .p-menuitem-icon {
      color: #ef4444 !important;
    }
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link:hover {
      background: #fef2f2 !important;
    }
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link:hover span,
    :host ::ng-deep .user-menu .logout-item .p-menuitem-link:hover i {
      color: #dc2626 !important;
    }
  `]
})
export class NavbarComponent implements OnInit {
  getNavMenuBar = getNavMenuBar;

  @Input() loginRedirect = '/hub';
  @Input() logoutRedirect = '/hub';

  userMenuItems: MenuItem[] = [];

  constructor(
    public app: AppService,
    public router: Router,
    private http: HttpClient,
  ) { }

  logout() {
    this.http.post(
      `${environment.apiUrl}/auth/logout`, {},
      { withCredentials: true }
    ).subscribe({
      next: () => this.app.handshake().subscribe({
        next: () => this.router.navigate([this.logoutRedirect]),
        error: (error) => console.log(error),
      }),
      error: (error) => console.log(error),
    });
  }

  get isLoggedIn() { return !!this.app.user; }

  ngOnInit(): void { 
    this.userMenuItems = [
      {
        label: 'Administration',
        icon: 'pi pi-cog',
        command: () => this.router.navigate(['/admin'])
      },
      {
        label: 'Log out',
        icon: 'pi pi-sign-out',
        styleClass: 'logout-item',
        command: () => this.logout()
      }
    ];
  }

  getNavIcon(label: string) {
    switch (label) {
      case 'Hub': return 'pi-home';
      case 'Sources': return 'pi-database';
      case 'Activities': return 'pi-bolt';
      case 'Admin': return 'pi-cog';
      default: return 'pi-list';
    }
  }
}
