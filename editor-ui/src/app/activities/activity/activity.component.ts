import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivitiesService } from '../../activities.service';
import { AppService } from '../../app.service';
import { isoLanguages } from '../../iso-languages';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.less']
})
export class ActivityComponent implements OnInit {

  isoLanguages = isoLanguages;

  @Input() activity: any;

  sources: any[] = [];
  sources_org: any[] = [];
  allActivities: any[] = [];

  model: any;
  translationRows: any[] = [];

  private readonly languageNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['en'], { type: 'language' })
      : null;

  getLanguageName(isoLanguageCode: string) {
    const code = isoLanguageCode?.trim().toLowerCase();
    if (!code) return '';
    return this.languageNames?.of(code) || code;
  }

  _v: any = {};

  @Output()
  completed = new EventEmitter();

  constructor(
    public app: AppService,
    private api: ActivitiesService,
    private confirm: ConfirmationService,
  ) { }

  ngOnInit(): void {
    this.api.sources().subscribe(
      (sources: any) => {
        this.sources_org = sources.map((s: any) => ({
          ...s,
          _filter_details: [
            s.name,
            s.description,
            ...(s.tags || []),
            s.user,
            ...(s.collaborator_emails || [])
          ].join(' ')
        }));
        this.sources = this.sources_org;
      },
      (error: any) => console.log(error)
    )

    if (this.activity.id) {
      this.api.read(this.activity.id).subscribe(
        (activity: any) => {
          this.model = activity;
          this.translationRows = Object.entries(activity.translations || {}).map(([iso, id]) => ({ iso, id }));
        },
        (error: any) => console.log(error)
      )
    } else {
      this.model = this.activity;
    }

    this.api.activities({}).subscribe(
      (activities: any) => {
        this.allActivities = activities.map((a: any) => ({
          ...a,
          iso: a.iso_language_code,
          _search_details: `${a.name} ${a.user} ${a.collaborator_emails?.join(' ') || ''} ${a.items?.map((i: any) => i.details?.name).join(' ') || ''}`
        }));
      }
    );
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
    this.model.translations = {};
    for (const t of this.translationRows) {
      if (t.iso && t.id) this.model.translations[t.iso] = t.id;
    }

    for (const item of this.model.items) {
      const details = this.sources_org.find(source => source.id == item.item);
      if (details) item.details = {
        name: details.name,
        description: details.description,
        language: details.language,
        tags: details.tags,
        iso_language_code: details.iso_language_code,
      };
    }

    const editing = this.model.id;
    (editing ? this.api.update(this.model) : this.api.create(this.model)).subscribe(
      (resp: any) => {
        const activity = { ...this.activity, ...resp };
        this.completed.emit(activity);
      },
      (error: any) => console.log(error)
    )
  }

  validate_pawssync_conflict() {
    if (!this.app.paws_sync_allowed) return true;

    const items: any[] = this.model.items || [];
    const itemIds = items.filter(i => i.item).map(i => i.item);
    const noDuplicateIds = new Set(itemIds).size === itemIds.length;

    const exactlyOneExample = items.filter(i => i.type === "example").length === 1;

    return exactlyOneExample && noDuplicateIds;
  }

  getAvailableLanguages() {
    return this.isoLanguages.filter(l => l.value !== this.model.iso_language_code);
  }

  addTranslationRow() {
    this.translationRows.push({ iso: '', id: '' });
  }

  removeTranslationRow(index: number) {
    this.confirm.confirm({
      header: 'Confirm',
      message: 'Are you sure you want to remove this link?',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.translationRows.splice(index, 1);
      }
    });
  }

  openActivity(id: string) {
    window.open(`${location.origin}${location.pathname}#/bundles?id=${id}`, '_blank');
  }

  openSource(id: string) {
    window.open(`${location.origin}${location.pathname}#/sources?id=${id}`, '_blank');
  }

  getAvailableActivities(currentRow: any) {
    const usedIds = this.translationRows.filter(r => r !== currentRow).map(r => r.id);
    return this.allActivities.filter(a =>
      a.id !== this.model.id &&
      !usedIds.includes(a.id) &&
      a.iso === currentRow.iso
    );
  }

  getSource(id: string) {
    return this.sources_org.find(s => s.id === id);
  }

  getActivity(id: string) {
    return this.allActivities.find(a => a.id === id);
  }

  getFilteredSources() {
    if (!this.model?.iso_language_code) return [];
    return this.sources.filter(s => s.iso_language_code === this.model.iso_language_code);
  }

  getItemTypeLabel(type: string) {
    if (type === 'example') return 'Worked-Example';
    if (type === 'challenge') return 'Code-Completion Problem';
    return type;
  }
}
