import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AppService } from '../app.service';

@Component({
  selector: 'app-update-password',
  templateUrl: './update-password.component.html',
  styleUrls: ['./update-password.component.less']
})
export class UpdatePasswordComponent {

  expired = false;
  pass_confirm = '';
  model: any = { new_password: '', token: '' };

  get isLoggedIn() { return this.app.user != null; }

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private app: AppService,
  ) {
    const qparams = this.route.snapshot.queryParams;
    this.model = { token: qparams['token'], new_password: '' };

    const expires = qparams['expires'];
    this.expired = expires < Date.now();
  }

  update() {
    this.http.patch(`${environment.apiUrl}/auth/update-password`, this.model, { withCredentials: true }).subscribe({
      next: (resp: any) => this.router.navigate(['/']),
      error: (error: any) => {
        if (error.status == 422)
          alert(error.error.message);
        else alert('Update password failed! try again, if this issue persists contact administrator.')
      }
    })
  }
}
