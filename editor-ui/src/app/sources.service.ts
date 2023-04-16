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

  sources() {
    return this.http.get(`${environment.apiUrl}/sources`);
  }

  create() {
    return this.http.post(`${environment.apiUrl}/sources`, {});
  }

  read(id: string) {
    return this.http.get(`${environment.apiUrl}/sources/${id}`);
  }

  update(source: any) {
    return this.http.patch(`${environment.apiUrl}/sources/${source.id}`, source);
  }

  genPreviewJson(source: any) {
    return this.http.patch(`${environment.apiUrl}/sources/${source.id}/preview`, source);
  }

  previewJsonLink(source: any) {
    return `${environment.apiUrl}/sources/${source.id}/preview`;
  }

  remove(id: string) {
    return this.http.delete(`${environment.apiUrl}/sources/${id}`);
  }
}
