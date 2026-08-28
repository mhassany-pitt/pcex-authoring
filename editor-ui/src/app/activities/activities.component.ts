import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivitiesService } from '../activities.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppService } from '../app.service';
import { getNavMenuBar, getTagLabel, getTagClass, getTagStyle } from '../utilities';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.less']
})
export class ActivitiesComponent implements OnInit, OnDestroy {

  getTagLabel = getTagLabel;
  getTagClass = getTagClass;
  getTagStyle = getTagStyle;

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
  create = false;
  activities: any[] = [];
  filteredActivities: any[] = [];
  activity: any = null;

  // Filter state
  searchQuery: string = '';
  selectedOwner: string = 'all';
  selectedAuthors: string[] = [];
  selectedItemTypes: string[] = [];
  selectedCodeLanguages: string[] = [];
  selectedLanguages: string[] = [];
  selectedStatuses: string[] = [];
  hasTranslationsFilter: boolean = false;
  selectedItemCounts: string[] = [];
  selectedTags: string[] = [];
  selectedSort: string = 'date_desc';
  ownerOptions = [
    { label: 'All', value: 'all' },
    { label: 'Mine', value: 'mine' },
    { label: 'Shared', value: 'shared' },
  ];

  itemTypeOptions = [
    { label: 'Worked-Example', value: 'example' },
    { label: 'Code-Completion Challenge', value: 'challenge' },
  ];

  itemCountOptions = [
    { label: '1 Bundle Item', value: '1' },
    { label: '2 – 4 Bundle Items', value: '2-4' },
    { label: '5+ Bundle Items', value: '5+' },
  ];

  statusOptions = [
    { label: 'Published on Hub', value: 'published' },
    { label: 'Synced with PAWS', value: 'paws' },
    { label: 'Draft / Unpublished', value: 'draft' },
  ];

  sortOptions = [
    { label: 'Date Created (Newest)', value: 'date_desc' },
    { label: 'Date Created (Oldest)', value: 'date_asc' },
    { label: 'Name (A – Z)', value: 'name_asc' },
    { label: 'Name (Z – A)', value: 'name_desc' },
    { label: 'Most Problems', value: 'items_desc' },
    { label: 'Fewest Problems', value: 'items_asc' },
  ];

  expandedItems: Record<string, boolean> = {};

  get totalCount(): number {
    return this.activities?.length || 0;
  }

  get mineCount(): number {
    const userEmail = this.app.user?.email?.toLowerCase();
    if (!userEmail || !this.activities) return 0;
    return this.activities.filter((a) => a.user?.toLowerCase() === userEmail).length;
  }

  get publishedCount(): number {
    return (this.activities || []).filter((a) => !!a.published).length;
  }

  get pawsSyncedCount(): number {
    return (this.activities || []).filter((a) => !!a.linkings).length;
  }

  filterByQuickStat(type: 'all' | 'mine' | 'published' | 'paws') {
    if (type === 'all') {
      this.selectedOwner = 'all';
      this.selectedStatuses = [];
    } else if (type === 'mine') {
      this.selectedOwner = this.selectedOwner === 'mine' ? 'all' : 'mine';
    } else if (type === 'published') {
      this.selectedStatuses = this.selectedStatuses.includes('published') ? [] : ['published'];
    } else if (type === 'paws') {
      this.selectedStatuses = this.selectedStatuses.includes('paws') ? [] : ['paws'];
    }
    this.onFilterChange();
  }

  toggleExpandItems(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.expandedItems[id] = !this.expandedItems[id];
  }

  isItemsExpanded(id: string): boolean {
    return !!this.expandedItems[id];
  }

  get availableAuthors(): { label: string; value: string }[] {
    const authors = new Set<string>();
    for (const a of this.activities || []) {
      if (a.user) authors.add(a.user);
    }
    return Array.from(authors)
      .sort((a, b) => a.localeCompare(b))
      .map((u) => ({
        label: u === this.app.user?.email ? `${u} (you)` : u,
        value: u,
      }));
  }

  get availableCodeLanguages(): { label: string; value: string }[] {
    const langs = new Set<string>();
    for (const a of this.activities || []) {
      if (a.language) langs.add(a.language);
      for (const it of a.items || []) {
        if (it.details?.language) langs.add(it.details.language);
      }
    }
    return Array.from(langs)
      .sort((a, b) => a.localeCompare(b))
      .map((l) => ({ label: l, value: l }));
  }

  get availableLanguages(): { label: string; value: string }[] {
    const codes = new Set<string>();
    for (const a of this.activities || []) {
      if (a.iso_language_code) codes.add(a.iso_language_code);
      for (const item of a.items || []) {
        if (item.details?.iso_language_code) codes.add(item.details.iso_language_code);
      }
    }
    return Array.from(codes)
      .map((code) => ({
        label: this.getLanguageName(code) || code,
        value: code,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get availableTags(): { label: string; value: string }[] {
    const tags = new Set<string>();
    for (const a of this.activities || []) {
      for (const t of a.tags || []) if (t) tags.add(getTagLabel(t));
      for (const it of a.items || []) {
        for (const t of it.details?.tags || []) if (t) tags.add(getTagLabel(t));
      }
    }
    return Array.from(tags)
      .sort((a, b) => a.localeCompare(b))
      .map((t) => ({ label: t, value: t }));
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchQuery?.trim()) count++;
    if (this.selectedOwner !== 'all') count++;
    count += this.selectedAuthors?.length || 0;
    count += this.selectedItemTypes?.length || 0;
    count += this.selectedCodeLanguages?.length || 0;
    count += this.selectedLanguages?.length || 0;
    count += this.selectedStatuses?.length || 0;
    if (this.hasTranslationsFilter) count++;
    count += this.selectedItemCounts?.length || 0;
    count += this.selectedTags?.length || 0;
    if (this.selectedSort !== 'date_desc') count++;
    if (this.archived) count++;
    return count;
  }

  get hasActiveFilters(): boolean {
    return this.activeFiltersCount > 0;
  }

  previewLink: any;
  showPreview = false;

  highlightedId: string | null = null;
  highlightTimeout: any;
  searchTimeout: any;
  private queryParamsSub?: Subscription;

  constructor(
    public api: ActivitiesService,
    public router: Router,
    public route: ActivatedRoute,
    public app: AppService,
    private confirm: ConfirmationService,
  ) { }

  ngOnInit(): void {
    const qParams = this.route.snapshot.queryParams;
    this.parseQueryParams(qParams);

    const initialEdit = qParams['edit'];
    if (initialEdit) {
      this.isDialogOpen = true;
      this.showBundleDialog = true;
      if (initialEdit === 'new') {
        this.isNewBundle = true;
        this.activity = { items: [{ type: 'example' }] };
      } else {
        this.isNewBundle = false;
        this.activity = { id: initialEdit };
        this.api.read(initialEdit).subscribe(
          (act: any) => {
            if (act) {
              this.activity = act;
            }
          },
          (error: any) => console.log(error)
        );
      }
    }

    this.reload(() => {
      const id = this.route.snapshot.queryParams['id'];
      if (id) {
        this.highlightAndScroll(id);
      }

      this.queryParamsSub = this.route.queryParams.subscribe((params) => {
        const changed = this.parseQueryParams(params);

        if (params['edit']) {
          this.selectActivityById(params['edit']);
        } else if (!params['edit'] && this.isDialogOpen) {
          this.closeEdit();
        }
        if (params['id'] && params['id'] !== this.highlightedId) {
          this.highlightAndScroll(params['id']);
        }

        if (changed) {
          this.applyFilters();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.queryParamsSub?.unsubscribe();
  }

  parseQueryParams(params: any): boolean {
    let changed = false;

    const parseArrayParam = (paramName: string, singularName: string, aliasPlural?: string, aliasSingular?: string): string[] => {
      if (params[paramName]) return params[paramName].split(',').filter(Boolean);
      if (aliasPlural && params[aliasPlural]) return params[aliasPlural].split(',').filter(Boolean);
      if (params[singularName] && params[singularName] !== 'all') return [params[singularName]];
      if (aliasSingular && params[aliasSingular] && params[aliasSingular] !== 'all') return [params[aliasSingular]];
      return [];
    };

    const arraysEqual = (a: string[], b: string[]) => {
      const aArr = a || [];
      const bArr = b || [];
      if (aArr.length !== bArr.length) return false;
      return aArr.every((val, idx) => val === bArr[idx]);
    };

    const newQuery = (params['q'] || '').trim();
    if (newQuery !== this.searchQuery) {
      this.searchQuery = newQuery;
      changed = true;
    }

    const newOwner = (params['owner'] && ['all', 'mine', 'shared'].includes(params['owner'])) ? params['owner'] : 'all';
    if (newOwner !== this.selectedOwner) {
      this.selectedOwner = newOwner;
      changed = true;
    }

    const newAuthors = parseArrayParam('authors', 'author');
    if (!arraysEqual(newAuthors, this.selectedAuthors)) {
      this.selectedAuthors = newAuthors;
      changed = true;
    }

    const newTypes = parseArrayParam('types', 'type', 'roles', 'role');
    if (!arraysEqual(newTypes, this.selectedItemTypes)) {
      this.selectedItemTypes = newTypes;
      changed = true;
    }

    const newCodeLangs = parseArrayParam('codeLangs', 'codeLang');
    if (!arraysEqual(newCodeLangs, this.selectedCodeLanguages)) {
      this.selectedCodeLanguages = newCodeLangs;
      changed = true;
    }

    const newLangs = parseArrayParam('langs', 'lang');
    if (!arraysEqual(newLangs, this.selectedLanguages)) {
      this.selectedLanguages = newLangs;
      changed = true;
    }

    const newStatuses = parseArrayParam('statuses', 'status');
    if (!arraysEqual(newStatuses, this.selectedStatuses)) {
      this.selectedStatuses = newStatuses;
      changed = true;
    }

    const newTrans = params['trans'] === 'true';
    if (newTrans !== this.hasTranslationsFilter) {
      this.hasTranslationsFilter = newTrans;
      changed = true;
    }

    const newCounts = parseArrayParam('counts', 'count');
    if (!arraysEqual(newCounts, this.selectedItemCounts)) {
      this.selectedItemCounts = newCounts;
      changed = true;
    }

    const newTags = parseArrayParam('tags', 'tag');
    if (!arraysEqual(newTags, this.selectedTags)) {
      this.selectedTags = newTags;
      changed = true;
    }

    const newSort = params['sort'] || 'date_desc';
    if (newSort !== this.selectedSort) {
      this.selectedSort = newSort;
      changed = true;
    }

    if (params['archived'] !== undefined) {
      const isArchived = params['archived'] === 'true';
      if (isArchived !== this.archived) {
        this._archived = isArchived;
        this.reload();
      }
    }

    return changed;
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

  applyFilters() {
    if (!this.activities) {
      this.filteredActivities = [];
      return;
    }

    const query = (this.searchQuery || '').trim().toLowerCase();
    const currentUser = this.app.user?.email?.toLowerCase();

    this.filteredActivities = this.activities.filter((activity: any) => {
      // 1. Owner filter
      if (this.selectedOwner === 'mine') {
        if (!currentUser || activity.user?.toLowerCase() !== currentUser) return false;
      } else if (this.selectedOwner === 'shared') {
        const collabs = (activity.collaborator_emails || []).map((e: string) => e?.toLowerCase());
        if (!currentUser || !collabs.includes(currentUser)) return false;
      }

      // 2. Specific Authors filter
      if (this.selectedAuthors?.length) {
        const lowerAuthors = this.selectedAuthors.map((a) => a.toLowerCase());
        if (!activity.user || !lowerAuthors.includes(activity.user.toLowerCase())) return false;
      }

      // 3. Item Composition filter
      if (this.selectedItemTypes?.length) {
        const hasMatch = (activity.items || []).some((it: any) =>
          this.selectedItemTypes.includes(it.type)
        );
        if (!hasMatch) return false;
      }

      // 4. Code Language filter
      if (this.selectedCodeLanguages?.length) {
        const lowerLangs = this.selectedCodeLanguages.map((l) => l.toLowerCase());
        const matchBundleLang = activity.language && lowerLangs.includes(activity.language.toLowerCase());
        const matchItemLang = (activity.items || []).some(
          (it: any) => it.details?.language && lowerLangs.includes(it.details.language.toLowerCase())
        );
        if (!matchBundleLang && !matchItemLang) return false;
      }

      // 5. Natural Language (ISO) filter
      if (this.selectedLanguages?.length) {
        const matchBundle = activity.iso_language_code && this.selectedLanguages.includes(activity.iso_language_code);
        const matchItem = (activity.items || []).some(
          (it: any) => it.details?.iso_language_code && this.selectedLanguages.includes(it.details.iso_language_code)
        );
        if (!matchBundle && !matchItem) return false;
      }

      // 6. Status filter
      if (this.selectedStatuses?.length) {
        const matchesStatus = this.selectedStatuses.some((st) => {
          if (st === 'published') return !!activity.published;
          if (st === 'paws') return !!activity.linkings;
          if (st === 'draft') return !activity.published;
          return false;
        });
        if (!matchesStatus) return false;
      }

      // 7. Translations filter
      if (this.hasTranslationsFilter) {
        const transCount = Object.keys(activity.translations || {}).length;
        if (transCount === 0) return false;
      }

      // 8. Item Count Range filter
      if (this.selectedItemCounts?.length) {
        const count = activity.items?.length || 0;
        const matchesCount = this.selectedItemCounts.some((range) => {
          if (range === '1') return count === 1;
          if (range === '2-4') return count >= 2 && count <= 4;
          if (range === '5+') return count >= 5;
          return false;
        });
        if (!matchesCount) return false;
      }

      // 9. Tag filter
      if (this.selectedTags?.length) {
        const bundleTags = (activity.tags || []).map((t: string) => getTagLabel(t));
        const itemTags = (activity.items || []).flatMap((it: any) => (it.details?.tags || []).map((t: string) => getTagLabel(t)));
        const allTags = new Set([...bundleTags, ...itemTags]);
        const hasTagMatch = this.selectedTags.some((t) => allTags.has(t));
        if (!hasTagMatch) return false;
      }

      // 10. Keyword Search filter
      if (query) {
        const details = (activity._filter_details || '').toLowerCase();
        if (!details.includes(query)) return false;
      }

      return true;
    });

    // Apply Sorting
    this.filteredActivities.sort((a: any, b: any) => {
      switch (this.selectedSort) {
        case 'date_asc':
          return this.getCreationTime(a) - this.getCreationTime(b);
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'items_desc':
          return (b.items?.length || 0) - (a.items?.length || 0);
        case 'items_asc':
          return (a.items?.length || 0) - (b.items?.length || 0);
        case 'date_desc':
        default:
          return this.getCreationTime(b) - this.getCreationTime(a);
      }
    });
  }

  updateUrlParams(replace = true) {
    const queryParams: any = {};
    if (this.searchQuery?.trim()) queryParams.q = this.searchQuery.trim();
    if (this.selectedOwner && this.selectedOwner !== 'all') queryParams.owner = this.selectedOwner;
    if (this.selectedAuthors?.length) queryParams.authors = this.selectedAuthors.join(',');
    if (this.selectedItemTypes?.length) queryParams.types = this.selectedItemTypes.join(',');
    if (this.selectedCodeLanguages?.length) queryParams.codeLangs = this.selectedCodeLanguages.join(',');
    if (this.selectedLanguages?.length) queryParams.langs = this.selectedLanguages.join(',');
    if (this.selectedStatuses?.length) queryParams.statuses = this.selectedStatuses.join(',');
    if (this.hasTranslationsFilter) queryParams.trans = 'true';
    if (this.selectedItemCounts?.length) queryParams.counts = this.selectedItemCounts.join(',');
    if (this.selectedTags?.length) queryParams.tags = this.selectedTags.join(',');
    if (this.selectedSort && this.selectedSort !== 'date_desc') queryParams.sort = this.selectedSort;
    if (this.archived) queryParams.archived = 'true';
    if (this.showBundleDialog) {
      if (this.isNewBundle) {
        queryParams.edit = 'new';
      } else if (this.activity?.id) {
        queryParams.edit = this.activity.id;
      } else if (this.route.snapshot.queryParams['edit']) {
        queryParams.edit = this.route.snapshot.queryParams['edit'];
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: replace,
    });
  }

  onSearchInput() {
    this.applyFilters();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.updateUrlParams(true);
    }, 200);
  }

  onFilterChange() {
    this.applyFilters();
    this.updateUrlParams(false);
  }

  clearFilters() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = '';
    this.selectedOwner = 'all';
    this.selectedAuthors = [];
    this.selectedItemTypes = [];
    this.selectedCodeLanguages = [];
    this.selectedLanguages = [];
    this.selectedStatuses = [];
    this.hasTranslationsFilter = false;
    this.selectedItemCounts = [];
    this.selectedTags = [];
    this.selectedSort = 'date_desc';
    this.applyFilters();
    this.updateUrlParams(false);
  }

  clearSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = '';
    this.applyFilters();
    this.updateUrlParams(false);
  }

  clearOwnerFilter() {
    this.selectedOwner = 'all';
    this.onFilterChange();
  }

  removeAuthor(author: string) {
    this.selectedAuthors = (this.selectedAuthors || []).filter((a) => a !== author);
    this.onFilterChange();
  }

  removeItemType(type: string) {
    this.selectedItemTypes = (this.selectedItemTypes || []).filter((t) => t !== type);
    this.onFilterChange();
  }

  removeCodeLanguage(lang: string) {
    this.selectedCodeLanguages = (this.selectedCodeLanguages || []).filter((l) => l !== lang);
    this.onFilterChange();
  }

  removeLanguage(code: string) {
    this.selectedLanguages = (this.selectedLanguages || []).filter((c) => c !== code);
    this.onFilterChange();
  }

  removeStatus(status: string) {
    this.selectedStatuses = (this.selectedStatuses || []).filter((s) => s !== status);
    this.onFilterChange();
  }

  clearTranslationsFilter() {
    this.hasTranslationsFilter = false;
    this.onFilterChange();
  }

  removeItemCount(count: string) {
    this.selectedItemCounts = (this.selectedItemCounts || []).filter((c) => c !== count);
    this.onFilterChange();
  }

  removeTag(tag: string) {
    this.selectedTags = (this.selectedTags || []).filter((t) => t !== tag);
    this.onFilterChange();
  }

  clearSortFilter() {
    this.selectedSort = 'date_desc';
    this.onFilterChange();
  }

  getCreationDate(activity: any): Date | null {
    if (activity?.created_at) {
      const d = new Date(activity.created_at);
      if (!isNaN(d.getTime())) return d;
    }
    if (activity?.id && typeof activity.id === 'string' && activity.id.length >= 8) {
      try {
        const time = parseInt(activity.id.substring(0, 8), 16) * 1000;
        const d = new Date(time);
        if (!isNaN(d.getTime())) return d;
      } catch (e) {}
    }
    return null;
  }

  getCreationTime(activity: any): number {
    const d = this.getCreationDate(activity);
    return d ? d.getTime() : 0;
  }

  cleanDescription(desc?: string): string {
    if (!desc) return '';
    return desc
      .replace(/\\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  get selectedOwnerLabel(): string {
    return this.ownerOptions.find((o) => o.value === this.selectedOwner)?.label || this.selectedOwner;
  }

  getItemTypeLabel(type: string): string {
    const found = this.itemTypeOptions.find((t) => t.value === type);
    return found ? found.label : type;
  }

  getStatusLabel(status: string): string {
    const found = this.statusOptions.find((s) => s.value === status);
    return found ? found.label : status;
  }

  getItemCountLabel(count: string): string {
    const found = this.itemCountOptions.find((c) => c.value === count);
    return found ? found.label : count;
  }

  get selectedSortLabel(): string {
    return this.sortOptions.find((s) => s.value === this.selectedSort)?.label || this.selectedSort;
  }

  toggleArchiveFilter() {
    this.reload(() => {
      this.updateUrlParams(false);
    });
  }

  isDialogOpen = false;
  showBundleDialog = false;
  isNewBundle = false;

  openCreate() {
    this.isDialogOpen = true;
    this.isNewBundle = true;
    this.activity = { items: [{ type: 'example' }] };
    this.showBundleDialog = true;
    this.updateUrlParams(false);
  }

  openEdit(activity: any) {
    this.isDialogOpen = true;
    this.isNewBundle = false;
    this.activity = activity;
    this.showBundleDialog = true;
    this.updateUrlParams(false);
  }

  closeEdit() {
    if (!this.isDialogOpen && !this.showBundleDialog && !this.route.snapshot.queryParams['edit']) {
      return;
    }
    this.isDialogOpen = false;
    this.activity = null;
    this.showBundleDialog = false;
    this.isNewBundle = false;
    this.updateUrlParams(false);
  }

  onDialogHide() {
    if (!this.isDialogOpen) {
      return;
    }
    this.closeEdit();
  }

  reload(then?: () => void) {
    this.create = false;
    this.api.activities({ archived: this.archived }).subscribe(
      (activities: any) => {
        this.activities = activities.map((activity: any) => {
          activity._filter_details = [
            activity.id,
            activity.name,
            activity.user,
            activity.language,
            activity.iso_language_code,
            this.getLanguageName(activity.iso_language_code),
            ...(activity.collaborator_emails || []),
            ...(activity.tags || []),
            ...activity.items.map((item: any) => {
              return [
                item.item,
                item.details?.name,
                item.details?.description,
                item.details?.language,
                item.details?.iso_language_code,
                this.getLanguageName(item.details?.iso_language_code),
                ...(item.details?.tags || []),
              ].join(' ');
            })
          ].join(' ');
          return activity;
        });

        this.applyFilters();

        const editId = this.route.snapshot.queryParams['edit'];
        if (editId && editId !== 'new') {
          const found = (this.activities || []).find((a: any) => a.id == editId);
          if (found) {
            this.activity = found;
          }
        }

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
        const found = this.activities.find((a: any) => a.id == activity.id);
        if (found) found.stat = updated.stat;
      });
    }, 1000);
    this.closeEdit();
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
    if (!id) return;
    if (id === 'new') {
      if (!this.showBundleDialog || !this.isNewBundle) {
        this.openCreate();
      }
      return;
    }
    if (this.activity?.id === id && this.showBundleDialog) {
      return;
    }
    const found = (this.activities || []).find((a: any) => a.id == id);
    if (found) {
      this.openEdit(found);
    } else {
      this.api.read(id).subscribe(
        (act: any) => {
          if (act) this.openEdit(act);
        },
        (error: any) => console.log(error)
      );
    }
  }
}
