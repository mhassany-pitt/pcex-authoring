import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivitiesService } from '../../activities.service';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.less']
})
export class ActivityComponent implements OnInit {

  @Input() activity: any;
  sources: any[] = [];

  model: any;

  @Output()
  completed = new EventEmitter();

  constructor(
    private api: ActivitiesService,
  ) { }

  ngOnInit(): void {
    this.api.sources().subscribe(
      (sources: any) => this.sources = sources,
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
      const details = this.sources.find(source => source.id == item.item);
      if (details) item.details = {
        name: details.name,
        description: details.description,
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
}
