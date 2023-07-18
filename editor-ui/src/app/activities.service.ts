import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SourcesService } from './sources.service';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {

  constructor(
    private http: HttpClient,
    private api: SourcesService,
    private sanitizer: DomSanitizer,
  ) { }

  sources() {
    return this.api.sources();
  }

  activities() {
    return this.http.get(`${environment.apiUrl}/activities`);
  }

  create(activity: any) {
    return this.http.post(`${environment.apiUrl}/activities`, activity);
  }

  read(id: string) {
    return this.http.get(`${environment.apiUrl}/activities/${id}`);
  }

  update(activity: any) {
    return this.http.patch(`${environment.apiUrl}/activities/${activity.id}`, activity);
  }

  remove(id: string) {
    return this.http.delete(`${environment.apiUrl}/activities/${id}`);
  }

  genPreviewJson(activity: any) {
    return this.http.patch(`${environment.apiUrl}/activities/${activity.id}/preview`, activity);
  }

  previewJsonLink(activity: any) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `http://localhost:4200/assets/preview/index.html?load=${`${environment.apiUrl}/activities/${activity.id}/preview`}?_t=${new Date().getTime()}`
    );
  }
}
