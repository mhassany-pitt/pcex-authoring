import { Component, OnInit } from '@angular/core';
import { ActivitiesService } from '../activities.service';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.less']
})
export class ActivitiesComponent implements OnInit {

  create = true;
  activities: any;
  activity: any;

  previewLink: any;
  showPreview = false;

  constructor(
    private api: ActivitiesService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.create = false;
    this.api.activities().subscribe(
      (activities: any) => this.activities = activities,
      (error: any) => console.log(error)
    );
  }

  download(activity: any) {
    this.api.download(activity);
  }

  remove(activity: any) {
    if (confirm('Deleting Activity! Are you sure?')) {
      this.api.remove(activity.id).subscribe(
        (activity: any) => this.reload(),
        (error: any) => console.log(error)
      )
    }
  }

  async preview(activity: any) {
    activity = await this.api.read(activity.id).toPromise();
    this.api.genPreviewJson(activity, "activity").subscribe(
      (resp: any) => {
        this.previewLink = this.api.previewJsonLink(activity, "activity");
        this.showPreview = true;
      },
      (error: any) => console.log(error)
    )
  }

  togglePublish(activity: any) {
    activity.published = !activity.published;
    this.api.update(activity).subscribe(
      (resp: any) => this.reload(),
      (error: any) => console.log(error)
    )
  }
}
