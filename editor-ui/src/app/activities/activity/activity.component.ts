import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivitiesService } from '../../activities.service';
import { AppService } from '../../app.service';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.less']
})
export class ActivityComponent implements OnInit {

  @Input() activity: any;

  sources: any[] = [];
  sources_org: any[] = [];

  model: any;

  _v: any = {};

  @Output()
  completed = new EventEmitter();

  constructor(
    public app: AppService,
    private api: ActivitiesService,
  ) { }

  ngOnInit(): void {
    this.api.sources().subscribe(
      (sources: any) => {
        this.sources_org = sources;
        this.sources = sources.map(({ id, name, tags, language }: any) => ({
          id, name: `${language} | ${name}${(tags?.length > 0 ? ' [tags:' + tags.join(', ') + ']' : '')}`
        }));
      },
      (error: any) => console.log(error)
    )

    if (this.activity.id) {
      this.api.read(this.activity.id).subscribe(
        (activity: any) => this.model = activity,
        (error: any) => console.log(error)
      )
    } else {
      this.model = this.activity;
    }
  }

  addItem() {
    if (!this.model.items)
      this.model.items = [];
    this.model.items.push({});
  }

  removeItem(item: any) {
    this.model.items.splice(this.model.items.indexOf(item), 1);
  }

  update() {
    for (const item of this.model.items) {
      const details = this.sources_org.find(source => source.id == item.item);
      if (details) item.details = {
        name: details.name,
        description: details.description,
        language: details.language,
        tags: details.tags,
      };
    }

    const editing = this.model.id;
    (editing ? this.api.update(this.model) : this.api.create(this.model)).subscribe(
      (resp: any) => {
        const activity = { ... this.activity, ...resp };
        this.completed.emit(activity);
      },
      (error: any) => console.log(error)
    )
  }

  validate_pawssync_conflict() {
    return this.app.paws_sync_allowed && this.model.items.filter((i: any) => i.type == 'example').length == 1;
  }
}
