import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AppService } from '../app.service';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthenticatedAuthorGuard  {

  constructor(
    private app: AppService,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.app.handshake().pipe(map((resp: any) => {
      if (!resp.user) {
        this.router.navigate(['/login']);
      } else if (!resp.user.roles?.includes('author')) {
        this.router.navigate(['/unauthorized']);
      }
      return !!resp.user;
    }));
  }
}
