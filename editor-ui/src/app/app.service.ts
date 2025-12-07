import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppService {

  user: any;
  paws_sync_allowed: boolean = false;

  constructor(private http: HttpClient) { }

  handshake() {
    return this.http
      .get(`${environment.apiUrl}/auth/handshake`, { withCredentials: true })
      .pipe(map((resp: any) => {
        this.user = resp?.user;
        this.paws_sync_allowed = resp?.allow_paws_sync;
        return resp;
      }));
  }
}
