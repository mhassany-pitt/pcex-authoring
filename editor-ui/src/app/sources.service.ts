import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';

@Injectable({
  providedIn: 'root'
})
export class SourcesService {

  previewJsons: any = {};
  isGeneratingPreviewJson(id: string) { return id in this.previewJsons; }

  constructor(
    private http: HttpClient
  ) { }

  // samples() {
  //   return this.http.get(`${environment.apiUrl}/sources/samples`, { withCredentials: true });
  // }

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

  log(id: string, log: any) {
    return this.http.post(`${environment.apiUrl}/sources/${id}/log`, log,
      { withCredentials: true, context: new HttpContext().set(NGX_LOADING_BAR_IGNORED, true) });
  }

  loadGptConfig() {
    return this.http.get(`${environment.apiUrl}/keyvalues/gpt-config`, { withCredentials: true });
  }

  setGptConfig(config: any) {
    return this.http.put(`${environment.apiUrl}/keyvalues/gpt-config`, { value: config }, { withCredentials: true });
  }

  clone(id: string) {
    return this.http.post(`${environment.apiUrl}/sources/${id}/clone`, {}, { withCredentials: true });
  }
}
