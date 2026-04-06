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
        label: 'ADMINISTRATION',
        icon: 'pi pi-cog',
        command: () => this.router.navigate(['/admin'])
      },
      {
        label: 'LOG OUT',
        icon: 'pi pi-sign-out',
        styleClass: 'logout-item',
        command: () => this.logout()
      }
    ];
  }

  getNavIcon(label: string) {
    switch (label) {
      case 'Hub': return 'pi-home';
      case 'Sources': return 'pi-file';
      case 'Bundles': return 'pi-box';
      case 'Admin': return 'pi-cog';
      default: return 'pi-list';
    }
  }
}
 