import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SourcesService } from '../sources.service';
import { ActivitiesService } from '../activities.service';

@Component({
  selector: 'app-sources',
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.less']
})
export class SourcesComponent implements OnInit {

  sources: any = [];

  previewLink: any;
  showPreview = false;

  constructor(
    private api: SourcesService,
    private activities: ActivitiesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  reload() {
    this.api.sources().subscribe(
      (sources: any) => this.sources = sources,
      (error: any) => console.log(error)
    )
  }

  create() {
    this.api.create().subscribe(
      (source: any) => this.router.navigate(['/editor', source.id]),
      (error: any) => console.log(error)
    )
  }

  remove(source: any) {
    if (confirm('Deleting Source! Are you sure?')) {
      this.api.remove(source.id).subscribe(
        (source: any) => this.reload(),
        (error: any) => console.log(error)
      )
    }
  }

  async preview(source: any) {
    source = await this.api.read(source.id).toPromise();
    this.activities.genPreviewJson({
      "id": source.id,
      "name": source.name,
      "items": [{ "item$": source, "type": "example" }],
    }).subscribe(
      (resp: any) => {
        this.previewLink = this.activities.previewJsonLink(source);
        this.showPreview = true;
      },
      (error: any) => console.log(error)
    )
  }
}
