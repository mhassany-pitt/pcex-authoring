import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SourcesService } from '../sources.service';
import { ActivitiesService } from '../activities.service';
import { AppService } from '../app.service';

@Component({
  selector: 'app-sources',
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.less']
})
export class SourcesComponent implements OnInit {

  _archived: boolean = localStorage.getItem('pcex-sources-archived') == 'true';
  get archived() { return this._archived; }
  set archived(bool) {
    this._archived = bool;
    localStorage.setItem('pcex-sources-archived', `${bool}`.toLowerCase());
  }
  sources: any = [];

  previewLink: any;
  showPreview = false;

  constructor(
    public api: SourcesService,
    private activities: ActivitiesService,
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
    this.api.sources({ archived: this.archived }).subscribe(
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
}
