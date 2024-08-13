import { Component, OnInit } from '@angular/core';
import { ActivitiesService } from '../activities.service';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavMenuBar } from '../utilities';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.less']
})
export class ActivitiesComponent implements OnInit {

  getNavMenuBar = getNavMenuBar;

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

  constructor(
    public api: ActivitiesService,
    public router: Router,
    public app: AppService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.create = false;
    this.api.activities({ archived: this.archived }).subscribe(
      (activities: any) => this.activities = activities,
      (error: any) => console.log(error)
    );
  }

  download(activity: any) {
    this.api.download(activity);
  }

  toggleArchive(activity: any) {
    activity.archived = !activity.archived;
    this.api.update(activity).subscribe(
      (activity: any) => this.reload(),
      (error: any) => console.log(error)
    );
  }

  update(activity: any) {
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
      (resp: any) => this.reload(),
      (error: any) => console.log(error)
    )
  }
}

// TODO: the id used for inserting the queries (should be check - avoid overwrite)
// TODO: execute all queries in a transaction
