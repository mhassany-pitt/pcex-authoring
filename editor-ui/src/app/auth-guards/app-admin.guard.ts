import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { AppService } from '../app.service';

@Injectable({ providedIn: 'root' })
export class AppAdminGuard  {

  constructor(
    private app: AppService,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.app.handshake().pipe(map((resp: any) => {
      if (!resp.user) {
        this.router.navigate(['/login']);
      } else if (!resp.user.roles?.includes('app-admin')) {
        this.router.navigate(['/unauthorized']);
      }
      return !!resp.user;
    }));
  }
}
