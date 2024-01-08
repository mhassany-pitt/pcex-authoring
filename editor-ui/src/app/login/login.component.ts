import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AppService } from '../app.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less']
})
export class LoginComponent {

  model = { email: '', password: '' };

  constructor(
    private http: HttpClient,
    private router: Router,
    private app: AppService,
  ) { }

  login() {
    this.http.post(`${environment.apiUrl}/auth/login`, this.model, { withCredentials: true }).subscribe({
      next: (resp: any) => this.router.navigate(['/sources']),
      error: (error: any) => {
        if (error.status == 401)
          alert(error.error.message);
        else alert('Login failed! try again, if this issue persists contact administrator.');
      }
    })
  }
}
