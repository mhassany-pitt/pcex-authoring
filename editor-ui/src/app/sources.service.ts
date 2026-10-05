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

  sources(options: any = {}) {
    const params = new URLSearchParams();
    if (options.archived) params.set('include', 'archived');
    if (options.allUsers) params.set('allUsers', 'true');
    if (options.page !== undefined) params.set('page', String(options.page));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.sort) params.set('sort', options.sort);
    if (options.q) params.set('q', options.q);
    if (options.owner && options.owner !== 'all') params.set('owner', options.owner);
    if (options.authors) params.set('authors', options.authors);
    if (options.codeLangs) params.set('codeLangs', options.codeLangs);
    if (options.langs) params.set('langs', options.langs);
    if (options.roles) params.set('roles', options.roles);
    if (options.trans) params.set('trans', 'true');
    if (options.tags) params.set('tags', options.tags);

    return this.http.get(`${environment.apiUrl}/sources${params.toString() ? `?${params.toString()}` : ''}`, { withCredentials: true });
  }

  create() {
    return this.http.post(`${environment.apiUrl}/sources`, {}, { withCredentials: true });
  }

  read(id: string, options?: { allUsers?: boolean }) {
    return this.http.get(`${environment.apiUrl}/sources/${id}${options?.allUsers ? '?allUsers=true' : ''}`, { withCredentials: true });
  }

  update(source: any, options?: { allUsers?: boolean }) {
    return this.http.patch(`${environment.apiUrl}/sources/${source.id}${options?.allUsers ? '?allUsers=true' : ''}`, source, { withCredentials: true });
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

  clone(id: string, options?: { allUsers?: boolean }) {
    return this.http.post(`${environment.apiUrl}/sources/${id}/clone${options?.allUsers ? '?allUsers=true' : ''}`, {}, { withCredentials: true });
  }
}
