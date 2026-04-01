import { Component } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ActivitiesService } from '../activities.service';
import { SourcesService } from '../sources.service';
import { environment } from '../../environments/environment';
import { getPreviewLink, getPublishedLink } from '../utilities';

type ActivitySourceAdminRow = {
  id: string;
  name: string;
  published: boolean;
  sourcesSortValue: string;
  selected: boolean;
  linkings: boolean;
  user: string;
  collaboratorEmails: string[];
  sourceUsers: string[];
  sourceCollaboratorEmails: string[];
  updatedAt: string;
  sources: ActivitySourceAdminSource[];
};

type ActivitySourceAdminSource = {
  id: string;
  name: string;
  user: string;
  collaboratorEmails: string[];
  isoLanguageCode: string;
  naturalLanguage: string;
  language: string;
  type: string;
  updatedAt: string;
};

type ActivitySourceAdminLog = {
  action: 'Generate Preview-JSON' | 'Sync to PAWS';
  kind: 'success' | 'error';
  log: string;
};

@Component({
  selector: 'app-activity-source-admin',
  templateUrl: './activity-source-admin.component.html',
  styleUrls: ['./activity-source-admin.component.less']
})
export class ActivitySourceAdminComponent {
  _archived: boolean = localStorage.getItem('pcex-admin-activity-source-archived') == 'true';
  get archived() { return this._archived; }
  set archived(bool: boolean) {
    this._archived = bool;
    localStorage.setItem('pcex-admin-activity-source-archived', `${bool}`.toLowerCase());
  }

  rows: ActivitySourceAdminRow[] = [];
  isRecompiling = false;
  isResyncing = false;
  progressCurrent = 0;
  progressTotal = 0;
  progressLabel = '';
  activityLogs: Record<string, ActivitySourceAdminLog[]> = {};
  private readonly languageNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : null;

  constructor(
    private activitiesService: ActivitiesService,
    private sourcesService: SourcesService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    forkJoin({
      activities: this.activitiesService.activities({ archived: this.archived, allUsers: true }) as any,
      sources: this.sourcesService.sources({ archived: this.archived, allUsers: true }) as any,
    }).subscribe({
      next: ({ activities, sources }: any) => {
        const sourceById = new Map<string, any>((sources || []).map((source: any) => [source.id, source]));

        this.rows = (activities || []).map((activity: any) => {
          const sources = (activity.items || [])
            .map((item: any) => {
              const source = sourceById.get(item.item);
              if (!source) return null;

              return {
                id: source.id,
                name: source.name,
                user: source.user,
                collaboratorEmails: source.collaborator_emails || [],
                isoLanguageCode: source.iso_language_code,
                naturalLanguage: this.getLanguageName(source.iso_language_code),
                language: source.language,
                type: item.type,
                updatedAt: source.updated_at,
              };
            })
            .filter((source: any) => !!source);

          return {
            id: activity.id,
            name: activity.name,
            published: !!activity.published,
            sourcesSortValue: (activity.items || [])
              .map((item: any) => {
                const source = sourceById.get(item.item);
                return source?.name || source?.id || '';
              })
              .filter((value: string) => !!value)
              .join(' '),
            selected: false,
            linkings: activity.linkings,
            user: activity.user,
            collaboratorEmails: activity.collaborator_emails || [],
            sourceUsers: this.distinctValues(sources.map((source: any) => source.user)),
            sourceCollaboratorEmails: this.distinctValues(sources.flatMap((source: any) => source.collaboratorEmails || [])),
            updatedAt: activity.updated_at,
            sources,
          };
        });
      },
      error: (error: any) => console.log(error),
    });
  }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  get selectedActivityIds() {
    return this.rows.filter((row) => row.selected).map((row) => row.id);
  }

  get allSelected() {
    return this.rows.length > 0 && this.rows.every((row) => row.selected);
  }

  setAllSelected(selected: boolean) {
    this.rows.forEach((row) => row.selected = selected);
  }

  get hasActivityLogs() {
    return Object.values(this.activityLogs).some((logs) => logs?.length > 0);
  }

  clearLogs() {
    this.activityLogs = {};
  }

  async recompileSelected() {
    const selectedRows = this.rows.filter((row) => row.selected);
    if (selectedRows.length == 0 || this.isRecompiling || this.isResyncing) return;

    this.isRecompiling = true;
    this.progressCurrent = 0;
    this.progressTotal = selectedRows.length;
    try {
      for (const [index, row] of selectedRows.entries()) {
        this.progressCurrent = index + 1;
        this.progressLabel = `[${this.progressCurrent} of ${this.progressTotal}] generating preview-json for "${row.name || row.id}"`;

        try {
          const activity: any = await firstValueFrom(this.activitiesService.read(row.id, { allUsers: true }));
          const resp: any = await firstValueFrom(this.activitiesService.genPreviewJson(activity, 'activity'));
          this.addActivityLog(
            row.id,
            'Generate Preview-JSON',
            'success',
            resp?.preview_log || `Generated preview JSON for "${row.name || row.id}".`
          );
        } catch (error) {
          console.log(error);
          this.addActivityLog(row.id, 'Generate Preview-JSON', 'error', this.getGenPreviewErrorLog(error));
        }
      }
    } finally {
      this.isRecompiling = false;
      this.progressCurrent = 0;
      this.progressTotal = 0;
      this.progressLabel = '';
    }
  }

  async resyncSelected() {
    const selectedRows = this.rows.filter((row) => row.selected);
    if (selectedRows.length == 0 || this.isResyncing || this.isRecompiling) return;

    this.isResyncing = true;
    this.progressCurrent = 0;
    this.progressTotal = selectedRows.length;
    try {
      for (const [index, row] of selectedRows.entries()) {
        this.progressCurrent = index + 1;
        this.progressLabel = `[${this.progressCurrent} of ${this.progressTotal}] syncing "${row.name || row.id}" to paws`;

        try {
          const resp: any = await firstValueFrom(this.activitiesService.sync(row.id, { allUsers: true }));
          if (resp?.paws_sync_error) {
            console.log(resp.paws_sync_error);
            this.addActivityLog(row.id, 'Sync to PAWS', 'error', resp.paws_sync_error_log || resp.paws_sync_error);
          } else {
            this.addActivityLog(
              row.id,
              'Sync to PAWS',
              'success',
              resp?.paws_sync_log || `Synced "${row.name || row.id}" to PAWS.`
            );
          }
        } catch (error) {
          console.log(error);
          this.addActivityLog(row.id, 'Sync to PAWS', 'error', this.getSyncErrorLog(error));
        }
      }
      this.reload();
    } finally {
      this.isResyncing = false;
      this.progressCurrent = 0;
      this.progressTotal = 0;
      this.progressLabel = '';
    }
  }

  private getLanguageName(isoLanguageCode: string) {
    const code = isoLanguageCode?.trim().toLowerCase() || 'en';
    return this.languageNames?.of(code)?.toLowerCase() || code;
  }

  private distinctValues(values: string[]) {
    return [...new Set((values || []).map((value) => value?.trim()).filter(Boolean))];
  }

  openPreview(row: ActivitySourceAdminRow) {
    const href = row.published
      ? getPublishedLink(row)
      : getPreviewLink(
          '?load=' + encodeURIComponent(
            `${environment.apiUrl}/activities/${row.id}/preview?type=activity&_t=${new Date().getTime()}`
          )
        );
    window.open(href, '_blank', 'noopener');
  }

  private addActivityLog(id: string, action: ActivitySourceAdminLog['action'], kind: ActivitySourceAdminLog['kind'], log: string) {
    if (!log) return;

    const logs = this.activityLogs[id] || [];
    const nextLog = { action, kind, log };
    this.activityLogs = {
      ...this.activityLogs,
      [id]: logs.some((entry) => entry.action == action)
        ? logs.map((entry) => entry.action == action ? nextLog : entry)
        : [...logs, nextLog]
    };
  }

  private getGenPreviewErrorLog(error: any) {
    return error?.error?.error_log || error?.error?.error || error?.message || 'Failed to generate preview JSON.';
  }

  private getSyncErrorLog(error: any) {
    return error?.error?.paws_sync_error_log || error?.error?.paws_sync_error || error?.message || 'Failed to sync to PAWS.';
  }
}
