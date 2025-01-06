import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { SourcesService } from './sources.service';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {

  previewJsons: any = {};
  isGeneratingPreviewJson(id: string) { return id in this.previewJsons; }

  constructor(
    private http: HttpClient,
    private api: SourcesService,
    private sanitizer: DomSanitizer,
  ) { }

  sources() {
    return this.api.sources({ archived: false });
  }

  activities({ archived }: any) {
    return this.http.get(`${environment.apiUrl}/activities${archived ? '?include=archived' : ''}`, { withCredentials: true });
  }

  create(activity: any) {
    return this.http.post(`${environment.apiUrl}/activities`, activity, { withCredentials: true });
  }

  read(id: string) {
    return this.http.get(`${environment.apiUrl}/activities/${id}`, { withCredentials: true });
  }

  update(activity: any) {
    return this.http.patch(`${environment.apiUrl}/activities/${activity.id}`, activity, { withCredentials: true });
  }

  genPreviewJson(activity: any, type: string) {
    return this.http.patch(`${environment.apiUrl}/activities/${activity.id}/preview?type=${type}`, activity, { withCredentials: true });
  }

  previewJsonLink(activity: any, type: string) {
    let baseHref = document.querySelector('base')?.href;
    if (baseHref?.endsWith('/')) baseHref = baseHref.slice(0, -1);
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${baseHref}/assets/preview/index.html` +
      `?load=${environment.apiUrl}/activities/${activity.id}/preview` +
      /**/ `?type=${type}&_t=${new Date().getTime()}`
    );
  }

  download(activity: any) {
    this.http.get(`${environment.apiUrl}/activities/${activity.id}/download`, {
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
    return this.http.post(`${environment.apiUrl}/activities/${activity.id}/clone`, {}, { withCredentials: true });
  }
}
