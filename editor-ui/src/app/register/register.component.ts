import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from '../app.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.less']
})
export class RegisterComponent implements OnInit {

  model = { fullname: '', email: '', password: '' };
  confirmation = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private app: AppService,
  ) { }

  ngOnInit(): void { }

  register() {
    this.http.post(
      `${environment.apiUrl}/auth/register`,
      this.model, { withCredentials: true }
    ).subscribe({
      next: (resp: any) => {
        alert('Registration successful! Please wait for the administrator (moh70@pitt.edu) to activate your account. Then use your credentials to login.');
        this.router.navigate(['login']);
      },
      error: (error: any) => {
        if (error.status == 422)
          alert(error.error.message);
        else alert('Registration failed! try again, if this issue persists contact administrator.');
      }
    })
  }
}
