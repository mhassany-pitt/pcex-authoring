import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppService } from '../app.service';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-auth-ctrl',
  templateUrl: './user-auth-ctrl.component.html',
  styleUrls: ['./user-auth-ctrl.component.less']
})
export class UserAuthCtrlComponent {

  constructor(
    public app: AppService,
    private http: HttpClient,
    private router: Router,
  ) { }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (error) => console.log(error),
    });
  }
}
