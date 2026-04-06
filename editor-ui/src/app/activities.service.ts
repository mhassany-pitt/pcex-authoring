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

  private buildQueryString({ archived, allUsers }: any = {}) {
    const params = new URLSearchParams();
    if (archived) params.set('include', 'archived');
    if (allUsers) params.set('allUsers', 'true');
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

  activities({ archived, allUsers }: any) {
    return this.http.get(`${environment.apiUrl}/bundles${this.buildQueryString({ archived, allUsers })}`, { withCredentials: true });
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
