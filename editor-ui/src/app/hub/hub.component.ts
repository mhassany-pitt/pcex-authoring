import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavMenuBar } from '../utilities';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less']
})
export class HubComponent implements OnInit {

  getNavMenuBar = getNavMenuBar;

  previewLink: any;
  showPreview = false;

  searchTimeout: any;
  activities: any[] = [];

  integrationToggles: any = {};
  integrationOptions = [{ label: 'View link', value: 'html' }];

  getIntegrationLink(activity: any, protocol: string) {
    return `https://acos.cs.vt.edu/${protocol}/acos-pcex/acos-pcex-examples/${activity.name.replace(/ /g, '_').replace(/\./g, '_')}__${activity.id}`
  }

  get isLoggedIn() { return !!this.app.user; }

  constructor(
    private http: HttpClient,
    public router: Router,
    private sanitizer: DomSanitizer,
    private title: Title,
    public app: AppService,
  ) { }

  ngOnInit(): void {
    this.title.setTitle('PCEX Hub');
    this.search('');
  }

  getLink(activity: any) {
    return `${document.querySelector('base')?.href}assets/preview/index.html?load=${environment.apiUrl}/hub/${activity.id}`;
  }

  async preview(activity: any) {
    this.previewLink = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.getLink(activity)}?_t=${new Date().getTime()}`);
    this.showPreview = true;
  }

  search(value: string) {
    if (this.searchTimeout)
      clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.http.get(`${environment.apiUrl}/hub?key=${value}`).subscribe(
        (activities: any) => {
          this.activities = activities.map((activity: any) => {
            // activity.id + activity.items.*.id/name/description
            activity._filter_idnamedescription = `${activity.id} ` + activity.items.map((item: any) => {
              return `${item.item} ${item.details.name} ${item.details.description} `;
            }).join(' ');
            return activity;
          });
        },
        (error: any) => console.log(error),
      );
    }, 300);
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  selectIntegrationLink(el: any) {
    setTimeout(() => el.querySelector('input.integration-link')?.select(), 0);
  }
}
