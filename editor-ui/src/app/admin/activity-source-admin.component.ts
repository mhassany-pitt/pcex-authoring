import { Component } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { ActivitiesService } from '../activities.service';
import { SourcesService } from '../sources.service';
import { environment } from '../../environments/environment';
import { getPreviewLink, getPublishedLink } from '../utilities';

type ActivitySourceAdminRow = {
  id: string;
  name: string;
  attributes: string[];
  attributesSearchValue: string;
  authors: string[];
  authorsSearchValue: string;
  programmingLanguages: string[];
  programmingLanguagesSearchValue: string;
  isoLanguageCodes: string[];
  isoLanguageCodesSearchValue: string;
  published: boolean;
  sourcesSortValue: string;
  selected: boolean;
  linkings: boolean;
  user: string;
  collaboratorEmails: string[];
  sourceUsers: string[];
  sourceCollaboratorEmails: string[];
  updatedAt: string;
  isoLanguageCode: string;
  naturalLanguage: string;
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
  action: 'Generate Preview-JSON' | 'Sync to PAWS' | 'Update ISO-Language Code';
  kind: 'success' | 'error';
  log: string;
};

type ActivitySourceAdminFilterGroup = {
  key: ActivitySourceAdminFilterSectionKey;
  label: string;
  items: {
    label: string;
    value: string;
    count: number;
  }[];
};

type ActivitySourceAdminFilterSectionKey =
  | 'attributes'
  | 'authors'
  | 'published'
  | 'sync'
  | 'programmingLanguages'
  | 'isoLanguageCodes';

@Component({
  selector: 'app-activity-source-admin',
  templateUrl: './activity-source-admin.component.html',
  styleUrls: ['./activity-source-admin.component.less'],
})
export class ActivitySourceAdminComponent {
  _archived: boolean =
    localStorage.getItem('pcex-admin-activity-source-archived') == 'true';
  get archived() {
    return this._archived;
  }
  set archived(bool: boolean) {
    this._archived = bool;
    localStorage.setItem(
      'pcex-admin-activity-source-archived',
      `${bool}`.toLowerCase(),
    );
  }

  rows: ActivitySourceAdminRow[] = [];
  selectedFilters: string[] = [];
  isRecompiling = false;
  isResyncing = false;
  isUpdatingIsoCode = false;
  progressCurrent = 0;
  progressTotal = 0;
  progressLabel = '';
  activityLogs: Record<string, ActivitySourceAdminLog[]> = {};
  private readonly languageNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['en'], { type: 'language' })
      : null;
  private readonly defaultAttributeOptions = ['example', 'challenge'];
  private readonly publishedStateOptions = [
    { label: 'published', value: 'published' },
    { label: 'not published', value: 'not-published' },
  ];
  private readonly syncStateOptions = [
    { label: 'synced to paws', value: 'synced' },
    { label: 'not synced to paws', value: 'not-synced' },
  ];
  filterSections: Record<ActivitySourceAdminFilterSectionKey, boolean> = {
    attributes: true,
    authors: true,
    published: true,
    sync: true,
    programmingLanguages: true,
    isoLanguageCodes: true,
  };

  constructor(
    private activitiesService: ActivitiesService,
    private sourcesService: SourcesService,
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    forkJoin({
      activities: this.activitiesService.activities({
        archived: this.archived,
        allUsers: true,
      }) as any,
      sources: this.sourcesService.sources({
        archived: this.archived,
        allUsers: true,
      }) as any,
    }).subscribe({
      next: ({ activities, sources }: any) => {
        const sourceById = new Map<string, any>(
          (sources || []).map((source: any) => [source.id, source]),
        );

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
          const attributes = this.distinctValues(
            (activity.items || []).map((item: any) =>
              this.normalizeAttribute(item?.type),
            ),
          );
          const authors = this.distinctValues([
            this.normalizeFilterValue(activity.user),
            ...sources.map((source: any) =>
              this.normalizeFilterValue(source.user),
            ),
          ]);
          const programmingLanguages = this.distinctValues(
            sources.map((source: any) =>
              this.normalizeFilterValue(source.language),
            ),
          );
          const isoLanguageCodes = this.distinctValues([
            this.normalizeIsoLanguageCode(activity.iso_language_code),
            ...sources.map((source: any) =>
              this.normalizeIsoLanguageCode(source.isoLanguageCode),
            ),
          ]);

          return {
            id: activity.id,
            name: activity.name,
            attributes,
            attributesSearchValue: attributes.join(' '),
            authors,
            authorsSearchValue: authors.join(' '),
            programmingLanguages,
            programmingLanguagesSearchValue: programmingLanguages.join(' '),
            isoLanguageCodes,
            isoLanguageCodesSearchValue: isoLanguageCodes.join(' '),
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
            sourceUsers: this.distinctValues(
              sources.map((source: any) => source.user),
            ),
            sourceCollaboratorEmails: this.distinctValues(
              sources.flatMap((source: any) => source.collaboratorEmails || []),
            ),
            updatedAt: activity.updated_at,
            isoLanguageCode: activity.iso_language_code,
            naturalLanguage: this.getLanguageName(activity.iso_language_code),
            sources,
          };
        });
        this.updateFilteredRows();
      },
      error: (error: any) => console.log(error),
    });
  }

  globalQuery = '';

  filter(table: any, $event: any) {
    this.globalQuery = ($event.target.value || '').trim();
    this.updateFilteredRows();
  }

  private matchesGlobalQuery(row: ActivitySourceAdminRow) {
    if (!this.globalQuery) return true;
    const query = this.globalQuery.toLowerCase();

    return [
      row.name,
      row.user,
      ...(row.collaboratorEmails || []),
      row.attributesSearchValue,
      row.authorsSearchValue,
      row.programmingLanguagesSearchValue,
      row.isoLanguageCodesSearchValue,
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    );
  }

  get selectedActivityIds() {
    return this.rows.filter((row) => row.selected).map((row) => row.id);
  }

  get attributeOptions() {
    return this.distinctValues([
      ...this.defaultAttributeOptions,
      ...this.rows.flatMap((row) => row.attributes || []),
    ]).map((attribute) => ({
      label: attribute,
      value: attribute,
    }));
  }

  get actionLabel() {
    if (this.isResyncing) return 'Syncing to PAWS...';
    if (this.isRecompiling) return 'Generating Preview-JSON...';
    if (this.isUpdatingIsoCode) return 'Updating ISO-Language Code...';
    return 'Sync to PAWS';
  }

  get actionIcon() {
    if (this.isResyncing || this.isRecompiling || this.isUpdatingIsoCode)
      return 'pi pi-spin pi-spinner';
    return 'pi pi-send';
  }

  actionOptions: MenuItem[] = [
    {
      label: 'Generate Preview-JSON',
      icon: 'pi pi-refresh',
      command: () => this.recompileSelected(),
    },
    {
      label: 'Set ISO-Language Code',
      icon: 'pi pi-language',
      command: () => this.updateIsoLanguageCodeSelected(),
    },
  ];

  handleMainAction() {
    if (this.isResyncing || this.isRecompiling || this.isUpdatingIsoCode)
      return;
    this.resyncSelected();
  }

  get authorOptions() {
    return this.distinctValues(
      this.rows.flatMap((row) => row.authors || []),
    ).map((author) => ({
      label: author,
      value: author,
    }));
  }

  get programmingLanguageOptions() {
    return this.distinctValues(
      this.rows.flatMap((row) => row.programmingLanguages || []),
    ).map((language) => ({
      label: language,
      value: language,
    }));
  }

  get isoLanguageCodeOptions() {
    return this.distinctValues(
      this.rows.flatMap((row) => row.isoLanguageCodes || []),
    ).map((isoLanguageCode) => ({
      label: isoLanguageCode,
      value: isoLanguageCode,
    }));
  }

  get filterOptions(): ActivitySourceAdminFilterGroup[] {
    const groups: ActivitySourceAdminFilterGroup[] = [
      {
        key: 'attributes',
        label: 'Attribute',
        items: this.attributeOptions.map((option) =>
          this.createFilterItem('attribute', option.value),
        ),
      },
      {
        key: 'authors',
        label: 'Authors',
        items: this.authorOptions.map((option) =>
          this.createFilterItem('author', option.value),
        ),
      },
      {
        key: 'published',
        label: 'Published',
        items: this.publishedStateOptions.map((option) =>
          this.createFilterItem('published', option.value),
        ),
      },
      {
        key: 'sync',
        label: 'PAWS Sync',
        items: this.syncStateOptions.map((option) =>
          this.createFilterItem('sync', option.value),
        ),
      },
      {
        key: 'programmingLanguages',
        label: 'Programming Language',
        items: this.programmingLanguageOptions.map((option) =>
          this.createFilterItem('language', option.value),
        ),
      },
      {
        key: 'isoLanguageCodes',
        label: 'ISO-Language Code',
        items: this.isoLanguageCodeOptions.map((option) =>
          this.createFilterItem('iso', option.value),
        ),
      },
    ];
    return groups.filter((group) => group.items.length > 0);
  }

  get selectedAttributeFilters() {
    return this.getSelectedFilterValues('attribute');
  }

  get selectedPublishedFilters() {
    return this.getSelectedFilterValues('published');
  }

  get selectedAuthorFilters() {
    return this.getSelectedFilterValues('author');
  }

  get selectedSyncFilters() {
    return this.getSelectedFilterValues('sync');
  }

  get selectedProgrammingLanguageFilters() {
    return this.getSelectedFilterValues('language');
  }

  get selectedIsoLanguageCodeFilters() {
    return this.getSelectedFilterValues('iso');
  }

  filteredRows: ActivitySourceAdminRow[] = [];

  updateFilteredRows() {
    this.filteredRows = this.rows.filter((row) => {
      const matchesAttributes =
        !this.selectedAttributeFilters.length ||
        row.attributes?.some((attribute) =>
          this.selectedAttributeFilters.includes(attribute),
        );
      const matchesAuthors =
        !this.selectedAuthorFilters.length ||
        row.authors?.some((author) =>
          this.selectedAuthorFilters.includes(author),
        );
      const matchesPublished =
        !this.selectedPublishedFilters.length ||
        this.selectedPublishedFilters.includes(
          row.published ? 'published' : 'not-published',
        );
      const matchesSync =
        !this.selectedSyncFilters.length ||
        this.selectedSyncFilters.includes(
          row.linkings ? 'synced' : 'not-synced',
        );
      const matchesProgrammingLanguages =
        !this.selectedProgrammingLanguageFilters.length ||
        row.programmingLanguages?.some((language) =>
          this.selectedProgrammingLanguageFilters.includes(language),
        );
      const matchesIsoLanguageCodes =
        !this.selectedIsoLanguageCodeFilters.length ||
        row.isoLanguageCodes?.some((isoLanguageCode) =>
          this.selectedIsoLanguageCodeFilters.includes(isoLanguageCode),
        );

      return (
        this.matchesGlobalQuery(row) &&
        matchesAttributes &&
        matchesAuthors &&
        matchesPublished &&
        matchesSync &&
        matchesProgrammingLanguages &&
        matchesIsoLanguageCodes
      );
    });
  }

  getAllSelected(table: any) {
    const rows = table?.filteredValue || table?.value || this.filteredRows;
    return (
      rows.length > 0 &&
      rows.every((row: any) => row.selected)
    );
  }

  setAllSelected(selected: boolean, table: any) {
    const rows = table?.filteredValue || table?.value || this.filteredRows;
    rows.forEach((row: any) => (row.selected = selected));
  }

  get hasActivityLogs() {
    return Object.values(this.activityLogs).some((logs) => logs?.length > 0);
  }

  clearLogs() {
    this.activityLogs = {};
  }

  async recompileSelected() {
    const selectedRows = this.rows.filter((row) => row.selected);
    if (
      selectedRows.length == 0 ||
      this.isRecompiling ||
      this.isResyncing ||
      this.isUpdatingIsoCode
    )
      return;

    this.isRecompiling = true;
    this.progressCurrent = 0;
    this.progressTotal = selectedRows.length;
    try {
      for (const [index, row] of selectedRows.entries()) {
        this.progressCurrent = index + 1;
        this.progressLabel = `[${this.progressCurrent} of ${this.progressTotal}] generating preview-json for "${row.name || row.id}"`;

        try {
          const activity: any = await firstValueFrom(
            this.activitiesService.read(row.id, { allUsers: true }),
          );
          const resp: any = await firstValueFrom(
            this.activitiesService.genPreviewJson(activity, 'activity'),
          );
          this.addActivityLog(
            row.id,
            'Generate Preview-JSON',
            'success',
            resp?.preview_log ||
              `Generated preview JSON for "${row.name || row.id}".`,
          );
        } catch (error) {
          console.log(error);
          this.addActivityLog(
            row.id,
            'Generate Preview-JSON',
            'error',
            this.getGenPreviewErrorLog(error),
          );
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
    if (
      selectedRows.length == 0 ||
      this.isResyncing ||
      this.isRecompiling ||
      this.isUpdatingIsoCode
    )
      return;

    this.isResyncing = true;
    this.progressCurrent = 0;
    this.progressTotal = selectedRows.length;
    try {
      for (const [index, row] of selectedRows.entries()) {
        this.progressCurrent = index + 1;
        this.progressLabel = `[${this.progressCurrent} of ${this.progressTotal}] syncing "${row.name || row.id}" to paws`;

        try {
          const resp: any = await firstValueFrom(
            this.activitiesService.sync(row.id, { allUsers: true }),
          );
          if (resp?.paws_sync_error) {
            console.log(resp.paws_sync_error);
            this.addActivityLog(
              row.id,
              'Sync to PAWS',
              'error',
              resp.paws_sync_error_log || resp.paws_sync_error,
            );
          } else {
            this.addActivityLog(
              row.id,
              'Sync to PAWS',
              'success',
              resp?.paws_sync_log || `Synced "${row.name || row.id}" to PAWS.`,
            );
          }
        } catch (error) {
          console.log(error);
          this.addActivityLog(
            row.id,
            'Sync to PAWS',
            'error',
            this.getSyncErrorLog(error),
          );
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
    const code = isoLanguageCode?.trim().toLowerCase();
    if (!code) return 'unknown';
    return this.languageNames?.of(code)?.toLowerCase() || code;
  }

  private normalizeAttribute(attribute: string) {
    return attribute?.trim().toLowerCase() || '';
  }

  private normalizeFilterValue(value: string) {
    return value?.trim().toLowerCase() || '';
  }

  private normalizeIsoLanguageCode(value: string) {
    return this.normalizeFilterValue(value) || 'unknown';
  }

  private getFilterToken(kind: string, value: string) {
    return `${kind}:${value}`;
  }

  async updateIsoLanguageCodeSelected() {
    const selectedRows = this.rows.filter((row) => row.selected);
    if (
      selectedRows.length == 0 ||
      this.isRecompiling ||
      this.isResyncing ||
      this.isUpdatingIsoCode
    )
      return;

    const isoCode = prompt(
      "Enter new ISO-Language code for sources in selected activities (e.g. 'en', 'es'):",
    );
    if (isoCode === null) return;

    const updatedSourceIds = new Set<string>();

    this.isUpdatingIsoCode = true;
    this.progressCurrent = 0;
    this.progressTotal = selectedRows.length;

    try {
      for (const [index, row] of selectedRows.entries()) {
        this.progressCurrent = index + 1;
        this.progressLabel = `[${this.progressCurrent} of ${this.progressTotal}] updating ISO-Language code for "${row.name || row.id}"`;

        const logs: string[] = [];
        let hasError = false;

        try {
          const activityDoc: any = await firstValueFrom(
            this.activitiesService.read(row.id, { allUsers: true }),
          );
          if (activityDoc.iso_language_code === isoCode) {
            logs.push(
              `Activity "${row.id}" already has ISO-Language code "${isoCode}".`,
            );
          } else {
            activityDoc.iso_language_code = isoCode;
            await firstValueFrom(
              this.activitiesService.update(activityDoc, { allUsers: true }),
            );
            logs.push(
              `Successfully updated ISO-Language code for activity "${row.id}".`,
            );
          }
        } catch (error: any) {
          hasError = true;
          logs.push(
            `Failed to update activity "${row.id}": ${error?.message || error}`,
          );
        }

        const sources = row.sources || [];
        for (const source of sources) {
          if (updatedSourceIds.has(source.id)) {
            logs.push(`Source "${source.id}" already updated in this batch.`);
            continue;
          }

          try {
            const sourceDoc: any = await firstValueFrom(
              this.sourcesService.read(source.id, { allUsers: true }),
            );
            if (sourceDoc.iso_language_code === isoCode) {
              logs.push(
                `Source "${source.id}" already has ISO-Language code "${isoCode}".`,
              );
            } else {
              sourceDoc.iso_language_code = isoCode;
              await firstValueFrom(
                this.sourcesService.update(sourceDoc, { allUsers: true }),
              );
              logs.push(
                `Successfully updated ISO-Language code for source "${source.id}".`,
              );
            }
            updatedSourceIds.add(source.id);
          } catch (error: any) {
            hasError = true;
            logs.push(
              `Failed to update source "${source.id}": ${error?.message || error}`,
            );
          }
        }

        this.addActivityLog(
          row.id,
          'Update ISO-Language Code',
          hasError ? 'error' : 'success',
          logs.join('\n'),
        );
      }
      this.reload();
    } finally {
      this.isUpdatingIsoCode = false;
      this.progressCurrent = 0;
      this.progressTotal = 0;
      this.progressLabel = '';
    }
  }

  isFilterSelected(value: string) {
    return this.selectedFilters.includes(value);
  }

  toggleFilterSelection(value: string, selected: boolean) {
    this.selectedFilters = selected
      ? this.distinctValues([...this.selectedFilters, value])
      : this.selectedFilters.filter((item) => item !== value);
    this.updateFilteredRows();
  }

  toggleFilter(value: string) {
    console.log('toggleFilter', value);
    this.toggleFilterSelection(value, !this.isFilterSelected(value));
  }

  clearFilters() {
    this.selectedFilters = [];
    this.updateFilteredRows();
  }

  toggleFilterSection(section: ActivitySourceAdminFilterSectionKey) {
    this.filterSections[section] = !this.filterSections[section];
  }

  isFilterAvailable(value: string) {
    return this.getFilterCount(value) > 0;
  }

  private getSelectedFilterValues(kind: string) {
    const prefix = `${kind}:`;
    return this.selectedFilters
      .filter((value) => value.startsWith(prefix))
      .map((value) => value.slice(prefix.length));
  }

  private createFilterItem(kind: string, value: string) {
    const token = this.getFilterToken(kind, value);
    return {
      label: value,
      value: token,
      count: this.getFilterCount(token),
    };
  }

  private getFilterCount(token: string) {
    const separatorIndex = token.indexOf(':');
    if (separatorIndex < 0) return 0;

    const kind = token.slice(0, separatorIndex);
    const value = token.slice(separatorIndex + 1);

    return this.rows.filter((row) => {
      if (kind == 'attribute' && !row.attributes?.includes(value)) return false;
      if (kind == 'author' && !row.authors?.includes(value)) return false;
      if (kind == 'published' && (row.published ? 'published' : 'not-published') != value) return false;
      if (kind == 'sync' && (row.linkings ? 'synced' : 'not-synced') != value) return false;
      if (kind == 'language' && !row.programmingLanguages?.includes(value)) return false;
      if (kind == 'iso' && !row.isoLanguageCodes?.includes(value)) return false;

      if (!this.matchesGlobalQuery(row)) return false;

      const matchesAttributes =
        kind === 'attribute' ||
        !this.selectedAttributeFilters.length ||
        row.attributes?.some((attribute) =>
          this.selectedAttributeFilters.includes(attribute),
        );
      const matchesAuthors =
        kind === 'author' ||
        !this.selectedAuthorFilters.length ||
        row.authors?.some((author) =>
          this.selectedAuthorFilters.includes(author),
        );
      const matchesPublished =
        kind === 'published' ||
        !this.selectedPublishedFilters.length ||
        this.selectedPublishedFilters.includes(
          row.published ? 'published' : 'not-published',
        );
      const matchesSync =
        kind === 'sync' ||
        !this.selectedSyncFilters.length ||
        this.selectedSyncFilters.includes(
          row.linkings ? 'synced' : 'not-synced',
        );
      const matchesProgrammingLanguages =
        kind === 'language' ||
        !this.selectedProgrammingLanguageFilters.length ||
        row.programmingLanguages?.some((language) =>
          this.selectedProgrammingLanguageFilters.includes(language),
        );
      const matchesIsoLanguageCodes =
        kind === 'iso' ||
        !this.selectedIsoLanguageCodeFilters.length ||
        row.isoLanguageCodes?.some((isoLanguageCode) =>
          this.selectedIsoLanguageCodeFilters.includes(isoLanguageCode),
        );

      return (
        matchesAttributes &&
        matchesAuthors &&
        matchesPublished &&
        matchesSync &&
        matchesProgrammingLanguages &&
        matchesIsoLanguageCodes
      );
    }).length;
  }

  private distinctValues(values: string[]) {
    return [
      ...new Set((values || []).map((value) => value?.trim()).filter(Boolean)),
    ];
  }

  openPreview(row: ActivitySourceAdminRow) {
    const href = row.published
      ? getPublishedLink(row)
      : getPreviewLink(
          '?load=' +
            encodeURIComponent(
              `${environment.apiUrl}/activities/${row.id}/preview?type=activity&_t=${new Date().getTime()}`,
            ),
        );
    window.open(href, '_blank', 'noopener');
  }

  private addActivityLog(
    id: string,
    action: ActivitySourceAdminLog['action'],
    kind: ActivitySourceAdminLog['kind'],
    log: string,
  ) {
    if (!log) return;

    const logs = this.activityLogs[id] || [];
    const nextLog = { action, kind, log };
    this.activityLogs = {
      ...this.activityLogs,
      [id]: logs.some((entry) => entry.action == action)
        ? logs.map((entry) => (entry.action == action ? nextLog : entry))
        : [...logs, nextLog],
    };
  }

  private getGenPreviewErrorLog(error: any) {
    return (
      error?.error?.error_log ||
      error?.error?.error ||
      error?.message ||
      'Failed to generate preview JSON.'
    );
  }

  private getSyncErrorLog(error: any) {
    return (
      error?.error?.paws_sync_error_log ||
      error?.error?.paws_sync_error ||
      error?.message ||
      'Failed to sync to PAWS.'
    );
  }
}
