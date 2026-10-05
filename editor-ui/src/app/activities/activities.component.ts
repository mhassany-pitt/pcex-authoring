import { Component, OnInit, OnDestroy, ViewChildren, QueryList, NgZone } from '@angular/core';
import { ActivitiesService } from '../activities.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppService } from '../app.service';
import { getNavMenuBar, getTagLabel, getTagClass, getTagStyle } from '../utilities';
import { ConfirmationService } from 'primeng/api';
import { MultiSelect } from 'primeng/multiselect';
import { Dropdown } from 'primeng/dropdown';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.less']
})
export class ActivitiesComponent implements OnInit, OnDestroy {

  getTagLabel = getTagLabel;
  getTagClass = getTagClass;
  getTagStyle = getTagStyle;

  @ViewChildren(MultiSelect) multiSelects!: QueryList<MultiSelect>;
  @ViewChildren(Dropdown) dropdowns!: QueryList<Dropdown>;

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

  // Pagination & Counts
  page: number = 1;
  pageSize: number = 25;
  totalRecords: number = 0;
  rowsPerPageOptions = [10, 25, 50, 100];
  isLoading = false;

  serverFilterOptions: {
    authors: string[];
    codeLangs: string[];
    langs: string[];
    tags: string[];
  } = {
    authors: [],
    codeLangs: [],
    langs: [],
    tags: [],
  };

  serverCounts = {
    total: 0,
    mine: 0,
    published: 0,
    paws: 0,
  };

  get firstItemIndex(): number {
    return this.totalRecords === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.page * this.pageSize, this.totalRecords);
  }

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
    return this.serverCounts.total;
  }

  get mineCount(): number {
    return this.serverCounts.mine;
  }

  get publishedCount(): number {
    return this.serverCounts.published;
  }

  get pawsSyncedCount(): number {
    return this.serverCounts.paws;
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
    return (this.serverFilterOptions?.authors || [])
      .map((u) => ({
        label: u === this.app.user?.email ? `${u} (you)` : u,
        value: u,
      }));
  }

  get availableCodeLanguages(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.codeLangs || [])
      .map((l) => ({ label: l, value: l }));
  }

  get availableLanguages(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.langs || [])
      .map((code) => ({
        label: this.getLanguageName(code) || code,
        value: code,
      }));
  }

  get availableTags(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.tags || [])
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

  private lastDropdownOpenTime = 0;

  private onInteractionListener = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target?.closest?.('.p-multiselect, .p-dropdown')) {
      this.lastDropdownOpenTime = Date.now();
    }
  };

  private onScrollListener = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target?.closest?.('.p-multiselect-panel, .p-dropdown-panel')) {
      return;
    }
    if (Date.now() - this.lastDropdownOpenTime < 350) {
      return;
    }
    if (this.hasOpenDropdown()) {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.closeOpenDropdowns();
        });
      }, 0);
    }
  };

  hasOpenDropdown(): boolean {
    const hasMs = this.multiSelects?.some(ms => !!ms.overlayVisible);
    const hasDd = this.dropdowns?.some(dd => !!dd.overlayVisible);
    return !!(hasMs || hasDd);
  }

  closeOpenDropdowns() {
    this.multiSelects?.forEach(ms => {
      if (ms.overlayVisible) {
        ms.hide();
      }
    });
    this.dropdowns?.forEach(dd => {
      if (dd.overlayVisible) {
        dd.hide();
      }
    });
  }

  constructor(
    public api: ActivitiesService,
    public router: Router,
    public route: ActivatedRoute,
    public app: AppService,
    private confirm: ConfirmationService,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScrollListener, true);
      window.addEventListener('pointerdown', this.onInteractionListener, true);
      window.addEventListener('keydown', this.onInteractionListener, true);
    });

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
          this.reload();
        }
      });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScrollListener, true);
    window.removeEventListener('pointerdown', this.onInteractionListener, true);
    window.removeEventListener('keydown', this.onInteractionListener, true);
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

    const newPage = Math.max(1, parseInt(params['page'], 10) || 1);
    if (newPage !== this.page) {
      this.page = newPage;
      changed = true;
    }

    const newLimit = Math.max(1, parseInt(params['limit'], 10) || 25);
    if (newLimit !== this.pageSize) {
      this.pageSize = newLimit;
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
    // Kept for backward compatibility; reload handles filtering
    this.reload();
  }

  updateUrlParams(replace = true) {
    const queryParams: any = {};
    if (this.page > 1) queryParams.page = this.page;
    if (this.pageSize !== 25) queryParams.limit = this.pageSize;
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
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.reload();
      this.updateUrlParams(true);
    }, 250);
  }

  onFilterChange() {
    this.page = 1;
    this.reload();
    this.updateUrlParams(false);
  }

  onPageChange(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.reload();
    this.updateUrlParams(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.page = 1;
    this.onFilterChange();
  }

  clearSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = '';
    this.onFilterChange();
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
    this.page = 1;
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
    this.isLoading = true;
    this.api.activities({
      page: this.page,
      limit: this.pageSize,
      sort: this.selectedSort,
      q: this.searchQuery?.trim() || undefined,
      owner: this.selectedOwner !== 'all' ? this.selectedOwner : undefined,
      authors: this.selectedAuthors?.length ? this.selectedAuthors.join(',') : undefined,
      types: this.selectedItemTypes?.length ? this.selectedItemTypes.join(',') : undefined,
      codeLangs: this.selectedCodeLanguages?.length ? this.selectedCodeLanguages.join(',') : undefined,
      langs: this.selectedLanguages?.length ? this.selectedLanguages.join(',') : undefined,
      statuses: this.selectedStatuses?.length ? this.selectedStatuses.join(',') : undefined,
      trans: this.hasTranslationsFilter ? 'true' : undefined,
      counts: this.selectedItemCounts?.length ? this.selectedItemCounts.join(',') : undefined,
      tags: this.selectedTags?.length ? this.selectedTags.join(',') : undefined,
      archived: this.archived,
    }).subscribe(
      (res: any) => {
        this.activities = res.items || [];
        this.filteredActivities = this.activities;
        this.totalRecords = res.total || 0;
        if (res.filterOptions) {
          this.serverFilterOptions = res.filterOptions;
        }
        if (res.counts) {
          this.serverCounts = res.counts;
        }

        const editId = this.route.snapshot.queryParams['edit'];
        if (editId && editId !== 'new') {
          const found = (this.activities || []).find((a: any) => a.id == editId);
          if (found) {
            this.activity = found;
          }
        }

        this.isLoading = false;
        then?.();
      },
      (error: any) => {
        console.error(error);
        this.isLoading = false;
      }
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
