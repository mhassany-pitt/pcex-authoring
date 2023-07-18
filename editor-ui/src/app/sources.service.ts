import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SourcesService {

  constructor(
    private http: HttpClient
  ) { }

  sources({ archived }: any) {
    return this.http.get(`${environment.apiUrl}/sources${archived ? '?include=archived' : ''}`, { withCredentials: true });
  }

  create() {
    return this.http.post(`${environment.apiUrl}/sources`, {}, { withCredentials: true });
  }

  read(id: string) {
    return this.http.get(`${environment.apiUrl}/sources/${id}`, { withCredentials: true });
  }

  update(source: any) {
    return this.http.patch(`${environment.apiUrl}/sources/${source.id}`, source, { withCredentials: true });
  }
}
