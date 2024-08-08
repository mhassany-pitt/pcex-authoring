import { Component, Input } from '@angular/core';
import { AppService } from '../app.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-auth-ctrl',
  templateUrl: './user-auth-ctrl.component.html',
  styleUrls: ['./user-auth-ctrl.component.less']
})
export class UserAuthCtrlComponent {

  @Input() loginRedirect = '/sources';
  @Input() logoutRedirect = '/login';

  constructor(
    public app: AppService,
    private http: HttpClient,
    private router: Router,
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
}
