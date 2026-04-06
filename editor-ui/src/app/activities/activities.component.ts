import { Component, OnInit } from '@angular/core';
import { ActivitiesService } from '../activities.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavMenuBar } from '../utilities';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.less']
})
export class ActivitiesComponent implements OnInit {

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

  _archived: boolean = localStorage.getItem('pcex-activities-archived') == 'true';
  get archived() { return this._archived; }
  set archived(bool) {
    this._archived = bool;
    localStorage.setItem('pcex-activities-archived', `${bool}`.toLowerCase());
  }
  create = true;
  activities: any;
  activity: any;

  previewLink: any;
  showPreview = false;

  highlightedId: string | null = null;
  highlightTimeout: any;

  constructor(
    public api: ActivitiesService,
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
    this.create = false;
    this.api.activities({ archived: this.archived }).subscribe(
      (activities: any) => {
        this.activities = activities.map((activity: any) => {
          // activity.id + activity.items.*.id/name/description
          activity._filter_idnamedescription = `${activity.id} ` + activity.items.map((item: any) => {
            return `${item.item} ${item.details.name} ${item.details.description} `;
          }).join(' ');
          return activity;
        });
        then?.();
      },
      (error: any) => console.log(error)
    );
  }

  download(activity: any) {
    this.api.download(activity);
  }

  toggleArchive(activity: any) {
    activity.archived = !activity.archived;
    this.api.update(activity).subscribe(
      (activity: any) => {
        this.alert_paws_sync_error(activity);
        this.reload();
      },
      (error: any) => console.log(error)
    );
  }

  update(activity: any) {
    this.alert_paws_sync_error(activity);

    if (activity) setTimeout(() => {
      this.genPreviewJson(activity, async () => {
        const updated: any = await this.api.read(activity.id).toPromise();
        this.activities.find((a: any) => a.id == activity.id).stat = updated.stat;
      });
    }, 1000);
    this.activity = null;
    this.reload();
  }

  async genPreviewJson(activity: any, then: () => void) {
    this.api.previewJsons[activity.id] = 'generating';
    activity = await this.api.read(activity.id).toPromise();
    this.api.genPreviewJson(activity, "activity").subscribe(
      (resp: any) => {
        delete this.api.previewJsons[activity.id];
        then?.();
      },
      (error: any) => console.log(error)
    )
  }

  async preview(activity: any) {
    this.previewLink = this.api.previewJsonLink(activity, "activity");
    this.showPreview = true;
  }

  togglePublish(activity: any) {
    activity.published = !activity.published;
    this.api.update(activity).subscribe(
      (resp: any) => {
        this.alert_paws_sync_error(activity);
        this.reload();
      },
      (error: any) => console.log(error)
    )
  }

  alert_paws_sync_error(activity: any) {
    if (activity?.paws_sync_error) {
      alert(activity.paws_sync_error);
      delete activity.paws_sync_error;
    }
  }

  clone(activity: any) {
    this.confirm.confirm({
      header: 'Confirm',
      message: 'Are you sure you want to clone this activity?',
      acceptButtonStyleClass: 'p-button-warning',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.api.clone(activity).subscribe(
          (clone: any) => this.reload(() => {
            this.activity = this.activities.find((a: any) => a.id == clone.id);
            setTimeout(() => document.getElementById(clone.id)?.scrollIntoView({ behavior: 'smooth' }), 300);
          }),
          (error: any) => console.log(error)
        );
      }
    });
  }

  selectActivityById(id: string) {
    if (!this.activities) return;
    this.activity = this.activities.find((a: any) => a.id == id);
  }
}
