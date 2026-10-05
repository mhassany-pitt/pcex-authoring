import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { SourcesService } from './sources.service';
import { DomSanitizer } from '@angular/platform-browser';
import { getPreviewLink } from './utilities';

@Injectable({ providedIn: 'root' })
export class ActivitiesService {

  previewJsons: any = {};
  isGeneratingPreviewJson(id: string) { return id in this.previewJsons; }

  private buildQueryString(options: any = {}) {
    const params = new URLSearchParams();
    if (options.archived) params.set('include', 'archived');
    if (options.allUsers) params.set('allUsers', 'true');
    if (options.page !== undefined) params.set('page', String(options.page));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.sort) params.set('sort', options.sort);
    if (options.q) params.set('q', options.q);
    if (options.owner && options.owner !== 'all') params.set('owner', options.owner);
    if (options.authors) params.set('authors', options.authors);
    if (options.types) params.set('types', options.types);
    if (options.codeLangs) params.set('codeLangs', options.codeLangs);
    if (options.langs) params.set('langs', options.langs);
    if (options.statuses) params.set('statuses', options.statuses);
    if (options.trans) params.set('trans', 'true');
    if (options.counts) params.set('counts', options.counts);
    if (options.tags) params.set('tags', options.tags);
    return params.toString() ? `?${params.toString()}` : '';
  }

  constructor(
    private http: HttpClient,
    private api: SourcesService,
    private sanitizer: DomSanitizer,
  ) { }

  sources() {
    return this.api.sources({ archived: false });
  }

  activities(options: any = {}) {
    return this.http.get(`${environment.apiUrl}/bundles${this.buildQueryString(options)}`, { withCredentials: true });
  }

  create(activity: any) {
    return this.http.post(`${environment.apiUrl}/bundles`, activity, { withCredentials: true });
  }

  read(id: string, { allUsers }: any = {}) {
    return this.http.get(`${environment.apiUrl}/bundles/${id}${this.buildQueryString({ allUsers })}`, { withCredentials: true });
  }

  update(activity: any, { allUsers }: any = {}) {
    return this.http.patch(`${environment.apiUrl}/bundles/${activity.id}${this.buildQueryString({ allUsers })}`, activity, { withCredentials: true });
  }

  genPreviewJson(activity: any, type: string) {
    return this.http.patch(`${environment.apiUrl}/bundles/${activity.id}/preview?type=${type}`, activity, { withCredentials: true });
  }

  sync(id: string, { allUsers }: any = {}) {
    return this.http.post(`${environment.apiUrl}/bundles/${id}/sync${this.buildQueryString({ allUsers })}`, {}, { withCredentials: true });
  }

  previewJsonLink(activity: any, type: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(getPreviewLink(
      '?load=' + encodeURIComponent(`${environment.apiUrl}/bundles/${activity.id}/preview?type=${type}&_t=${new Date().getTime()}`)
    ));
  }

  download(activity: any) {
    this.http.get(`${environment.apiUrl}/bundles/${activity.id}/download`, {
      responseType: 'blob',
      withCredentials: true
    }).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activity.name}.zip`;
      link.dispatchEvent(new MouseEvent('click'));
      URL.revokeObjectURL(url);
    }, err => console.error('Error during file download:', err));
  }

  clone(activity: any) {
    return this.http.post(`${environment.apiUrl}/bundles/${activity.id}/clone`, {}, { withCredentials: true });
  }
}
