import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AppService } from '../app.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HandshakeGuard  {

  constructor(private app: AppService) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.app.handshake().pipe(
      map(() => true),
      catchError(err => {
        console.error(err);
        return of(false);
      })
    );
  }
}
