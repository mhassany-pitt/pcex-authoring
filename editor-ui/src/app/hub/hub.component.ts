import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less']
})
export class HubComponent implements OnInit {

  previewLink: any;
  showPreview = false;

  searchTimeout: any;
  activities: any[] = [];

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private title: Title,
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
        (resp: any) => {
          this.activities = resp;
        },
        (error: any) => console.log(error),
      );
    }, 300);
  }
}
