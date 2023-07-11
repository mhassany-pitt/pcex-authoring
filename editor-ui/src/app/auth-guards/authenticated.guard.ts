import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot, CanActivate,
  Router, RouterStateSnapshot
} from '@angular/router';
import { AppService } from '../app.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthenticatedGuard implements CanActivate {

  constructor(
    private app: AppService,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.app.handshake().pipe(map((resp: any) => {
      if (!resp.user) {
        this.router.navigate(['/login']);
      }
      return !!resp.user;
    }));
  }
}
