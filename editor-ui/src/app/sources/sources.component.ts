import { Component, OnInit } from '@angular/core';
import { SourcesService } from '../sources.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivitiesService } from '../activities.service';
import { AppService } from '../app.service';
import { getNavMenuBar } from '../utilities';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-sources',
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.less']
})
export class SourcesComponent implements OnInit {

  private readonly languageNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['en'], { type: 'language' })
      : null;

  getLanguageName(isoLanguageCode: string) {
    try {
      const code = isoLanguageCode?.trim().toLowerCase();
      if (!code) return '';
      return this.languageNames?.of(code) || code;
    } catch (e) {
      return isoLanguageCode;
    }
  }

  _archived: boolean = localStorage.getItem('pcex-sources-archived') == 'true';
  get archived() { return this._archived; }
  set archived(bool) {
    this._archived = bool;
    localStorage.setItem('pcex-sources-archived', `${bool}`.toLowerCase());
  }
  sources: any = [];

  previewLink: any;
  showPreview = false;

  highlightedId: string | null = null;
  highlightTimeout: any;

  constructor(
    public api: SourcesService,
    private activities: ActivitiesService,
    public router: Router,
    public route: ActivatedRoute,
    public app: AppService,
    private confirm: ConfirmationService,
  ) { }

  ngOnInit(): void {
    this.reload(() => {
      this.route.queryParams.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.highlightAndScroll(id);
        }
      });
    });
  }

  highlightAndScroll(id: string) {
    this.highlightedId = id;
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
    this.highlightTimeout = setTimeout(() => {
      this.highlightedId = null;
    }, 3000);
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload(then?: () => void) {
    this.api.sources({ archived: this.archived }).subscribe(
      (sources: any) => {
        this.sources = sources.map((source: any) => {
          source._filter_details = [
            source.name,
            source.description,
            ...(source.tags || []),
            source.user,
            ...(source.collaborator_emails || [])
          ].join(' ');
          return source;
        });
        then?.();
      },
      (error: any) => console.log(error)
    )
  }

  create() {
    this.api.create().subscribe(
      (source: any) => this.router.navigate(['/editor', source.id]),
      (error: any) => console.log(error)
    )
  }

  toggleArchive(source: any) {
    source.archived = !source.archived;
    this.api.update(source).subscribe(
      (source: any) => this.reload(),
      (error: any) => console.log(error)
    );
  }

  async preview(source: any) {
    source = await this.api.read(source.id).toPromise();
    this.previewLink = this.activities.previewJsonLink(source, "source");
    this.showPreview = true;
    // const blankLns = Object.keys(source.lines || {})
    //   .filter(ln => source.lines[ln].blank);
    // this.activities.genPreviewJson({
    //   "id": source.id,
    //   "name": source.name,
    //   "items": [{ "item$": source, "type": blankLns.length ? "challenge" : "example" }],
    // }, "source").subscribe(
    //   (resp: any) => {
    //   },
    //   (error: any) => console.log(error)
    // )
  }

  clone(source: any) {
    this.confirm.confirm({
      header: 'Confirm',
      message: 'Are you sure you want to clone this source?',
      acceptButtonStyleClass: 'p-button-warning',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.api.clone(source.id).subscribe(
          (source: any) => this.router.navigate(['/editor', source.id]),
          (error: any) => console.log(error)
        );
      }
    });
  }
}
