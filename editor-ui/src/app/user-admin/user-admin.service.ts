import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {

  constructor(
    private http: HttpClient,
  ) { }

  list() {
    return this.http.get(`${environment.apiUrl}/user-admin`, { withCredentials: true });
  }

  create(model: any) {
    return this.http.post(`${environment.apiUrl}/user-admin`, model, { withCredentials: true });
  }

  update(model: any) {
    return this.http.patch(`${environment.apiUrl}/user-admin`, model, { withCredentials: true });
  }

  genUpdatePassTokens(emails: string[]) {
    return this.http.post(`${environment.apiUrl}/user-admin/update-password-tokens`, emails, { withCredentials: true });
  }
}
