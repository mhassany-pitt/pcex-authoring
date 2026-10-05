import { Component, OnInit, OnDestroy, ViewChildren, QueryList, NgZone } from '@angular/core';
import { SourcesService } from '../sources.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActivitiesService } from '../activities.service';
import { AppService } from '../app.service';
import { ConfirmationService } from 'primeng/api';
import { MultiSelect } from 'primeng/multiselect';
import { Dropdown } from 'primeng/dropdown';
import { getTagLabel, getTagClass, getTagStyle } from '../utilities';

@Component({
  selector: 'app-sources',
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.less']
})
export class SourcesComponent implements OnInit, OnDestroy {

  getTagLabel = getTagLabel;
  getTagClass = getTagClass;
  getTagStyle = getTagStyle;

  @ViewChildren(MultiSelect) multiSelects!: QueryList<MultiSelect>;
  @ViewChildren(Dropdown) dropdowns!: QueryList<Dropdown>;

  private readonly languageNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['en'], { type: 'language' })
      : null;

  getLanguageName(isoLanguageCode: string): string {
    try {
      const code = isoLanguageCode?.trim().toLowerCase();
      if (!code) return '';
      return this.languageNames?.of(code) || code;
    } catch (e) {
      return isoLanguageCode || '';
    }
  }

  // Sidebar collapse state
  sidebarCollapsed: boolean = localStorage.getItem('pcex-sources-sidebar-collapsed') === 'true';

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('pcex-sources-sidebar-collapsed', String(this.sidebarCollapsed));
  }

  // Archived toggle
  _archived: boolean = localStorage.getItem('pcex-sources-archived') === 'true';
  get archived(): boolean { return this._archived; }
  set archived(bool: boolean) {
    this._archived = bool;
    localStorage.setItem('pcex-sources-archived', `${bool}`.toLowerCase());
  }

  // Data & Pagination
  sources: any[] = [];
  filteredSources: any[] = [];
  isLoading = false;
  page: number = 1;
  pageSize: number = 25;
  totalRecords: number = 0;
  rowsPerPageOptions = [10, 25, 50, 100];

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

  get firstItemIndex(): number {
    return this.totalRecords === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.page * this.pageSize, this.totalRecords);
  }

  // Filter Models
  searchQuery: string = '';
  selectedOwner: 'all' | 'mine' | 'shared' = 'all';
  selectedAuthors: string[] = [];
  selectedProgLangs: string[] = [];
  selectedLanguages: string[] = [];
  selectedRoles: string[] = [];
  hasTranslationsFilter: boolean = false;
  selectedTags: string[] = [];

  // Sorting
  selectedSort: string = 'date_desc';

  searchTimeout: any;

  // Preview Dialog
  previewLink: any;
  showPreview = false;

  // Row Highlight
  highlightedId: string | null = null;
  highlightTimeout: any;
  private queryParamsSub?: Subscription;

  // Options Definitions
  ownerOptions = [
    { label: 'All', value: 'all' },
    { label: 'Mine', value: 'mine' },
    { label: 'Shared', value: 'shared' },
  ];

  roleOptions = [
    { label: 'Worked-Example (0 blanks)', value: 'example' },
    { label: 'Challenge (1–3 blanks)', value: 'challenge' },
  ];

  sortOptions = [
    { label: 'Date Created (Newest)', value: 'date_desc' },
    { label: 'Date Created (Oldest)', value: 'date_asc' },
    { label: 'Name (A – Z)', value: 'name_asc' },
    { label: 'Name (Z – A)', value: 'name_desc' },
    { label: 'Most Blank Lines', value: 'blanks_desc' },
    { label: 'Fewest Blank Lines', value: 'blanks_asc' },
  ];

  constructor(
    public api: SourcesService,
    private activities: ActivitiesService,
    public router: Router,
    public route: ActivatedRoute,
    public app: AppService,
    private confirm: ConfirmationService,
    private ngZone: NgZone,
  ) { }

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

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScrollListener, true);
      window.addEventListener('pointerdown', this.onInteractionListener, true);
      window.addEventListener('keydown', this.onInteractionListener, true);
    });

    // Read query params on initial load
    this.parseQueryParams(this.route.snapshot.queryParams);

    this.reload(() => {
      const id = this.route.snapshot.queryParams['id'];
      if (id) {
        this.highlightAndScroll(id);
      }

      this.queryParamsSub = this.route.queryParams.subscribe(p => {
        const changed = this.parseQueryParams(p);
        if (changed) {
          this.reload();
        }
        const id = p['id'];
        if (id && id !== this.highlightedId) {
          this.highlightAndScroll(id);
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

    const arraysEqual = (a: string[], b: string[]) => {
      const aArr = a || [];
      const bArr = b || [];
      if (aArr.length !== bArr.length) return false;
      return aArr.every((val, idx) => val === bArr[idx]);
    };

    const parseArray = (pluralKey: string, singularKey: string, aliasPlural?: string, aliasSingular?: string): string[] => {
      if (params[pluralKey]) return params[pluralKey].split(',').filter(Boolean);
      if (aliasPlural && params[aliasPlural]) return params[aliasPlural].split(',').filter(Boolean);
      if (params[singularKey] && params[singularKey] !== 'all') return [params[singularKey]];
      if (aliasSingular && params[aliasSingular] && params[aliasSingular] !== 'all') return [params[aliasSingular]];
      return [];
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

    const newAuthors = parseArray('authors', 'author');
    if (!arraysEqual(newAuthors, this.selectedAuthors)) {
      this.selectedAuthors = newAuthors;
      changed = true;
    }

    const newCodeLangs = parseArray('codeLangs', 'codeLang');
    if (!arraysEqual(newCodeLangs, this.selectedProgLangs)) {
      this.selectedProgLangs = newCodeLangs;
      changed = true;
    }

    const newLangs = parseArray('langs', 'lang');
    if (!arraysEqual(newLangs, this.selectedLanguages)) {
      this.selectedLanguages = newLangs;
      changed = true;
    }

    const newRoles = parseArray('roles', 'role', 'types', 'type');
    if (!arraysEqual(newRoles, this.selectedRoles)) {
      this.selectedRoles = newRoles;
      changed = true;
    }

    const newTrans = params['trans'] === 'true';
    if (newTrans !== this.hasTranslationsFilter) {
      this.hasTranslationsFilter = newTrans;
      changed = true;
    }

    const newTags = parseArray('tags', 'tag');
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
        this.archived = isArchived;
        this.reload();
      }
    }

    return changed;
  }

  // Active Filters Getters
  get hasActiveFilters(): boolean {
    return (
      !!this.searchQuery?.trim() ||
      this.selectedOwner !== 'all' ||
      this.selectedAuthors.length > 0 ||
      this.selectedProgLangs.length > 0 ||
      this.selectedLanguages.length > 0 ||
      this.selectedRoles.length > 0 ||
      this.hasTranslationsFilter ||
      this.selectedTags.length > 0
    );
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchQuery?.trim()) count++;
    if (this.selectedOwner !== 'all') count++;
    if (this.selectedAuthors.length) count += this.selectedAuthors.length;
    if (this.selectedProgLangs.length) count += this.selectedProgLangs.length;
    if (this.selectedLanguages.length) count += this.selectedLanguages.length;
    if (this.selectedRoles.length) count += this.selectedRoles.length;
    if (this.hasTranslationsFilter) count++;
    if (this.selectedTags.length) count += this.selectedTags.length;
    return count;
  }

  get selectedOwnerLabel(): string {
    return this.selectedOwner === 'mine' ? 'Mine' : 'Shared';
  }

  getRoleLabel(role: string): string {
    return this.roleOptions.find(r => r.value === role)?.label || role;
  }

  // Dynamic Options from Server Filter Options
  get availableAuthors(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.authors || [])
      .map(u => ({
        label: u === this.app.user?.email ? `${u} (you)` : u,
        value: u,
      }));
  }

  get progLangOptions(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.codeLangs || [])
      .map(l => ({ label: l.toUpperCase(), value: l }));
  }

  get availableLanguages(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.langs || [])
      .map(code => ({
        label: this.getLanguageName(code) || code,
        value: code,
      }));
  }

  get availableTags(): { label: string; value: string }[] {
    return (this.serverFilterOptions?.tags || [])
      .map(t => ({ label: t, value: t }));
  }

  // Filter Removal Helpers
  clearFilters() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = '';
    this.selectedOwner = 'all';
    this.selectedAuthors = [];
    this.selectedProgLangs = [];
    this.selectedLanguages = [];
    this.selectedRoles = [];
    this.hasTranslationsFilter = false;
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
    this.selectedAuthors = this.selectedAuthors.filter(a => a !== author);
    this.onFilterChange();
  }

  removeProgLang(lang: string) {
    this.selectedProgLangs = this.selectedProgLangs.filter(l => l !== lang);
    this.onFilterChange();
  }

  removeLanguage(lang: string) {
    this.selectedLanguages = this.selectedLanguages.filter(l => l !== lang);
    this.onFilterChange();
  }

  removeRole(role: string) {
    this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    this.onFilterChange();
  }

  clearTranslationsFilter() {
    this.hasTranslationsFilter = false;
    this.onFilterChange();
  }

  removeTag(tag: string) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
    this.onFilterChange();
  }

  toggleArchiveFilter() {
    this.page = 1;
    this.reload(() => {
      this.updateUrlParams(false);
    });
  }

  // Date Parsing Helpers
  getCreationDate(source: any): Date | null {
    if (source.created_at) {
      const d = new Date(source.created_at);
      if (!isNaN(d.getTime())) return d;
    }
    if (source.id && typeof source.id === 'string' && source.id.length === 24) {
      try {
        const timestamp = parseInt(source.id.substring(0, 8), 16) * 1000;
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d;
      } catch (e) {}
    }
    return null;
  }

  getCreationTime(source: any): number {
    return this.getCreationDate(source)?.getTime() || 0;
  }

  getUpdatedDate(source: any): Date | null {
    if (source.updated_at) {
      const d = new Date(source.updated_at);
      if (!isNaN(d.getTime())) return d;
    }
    return this.getCreationDate(source);
  }

  getUpdatedTime(source: any): number {
    return this.getUpdatedDate(source)?.getTime() || 0;
  }

  applyFilters() {
    // Kept for backward-compatibility with any internal calls; reload handles filtering
    this.reload();
  }

  updateUrlParams(replace = true) {
    const queryParams: any = {};
    if (this.page > 1) queryParams.page = this.page;
    if (this.pageSize !== 25) queryParams.limit = this.pageSize;
    if (this.searchQuery?.trim()) queryParams.q = this.searchQuery.trim();
    if (this.selectedOwner && this.selectedOwner !== 'all') queryParams.owner = this.selectedOwner;
    if (this.selectedAuthors?.length) queryParams.authors = this.selectedAuthors.join(',');
    if (this.selectedProgLangs?.length) queryParams.codeLangs = this.selectedProgLangs.join(',');
    if (this.selectedLanguages?.length) queryParams.langs = this.selectedLanguages.join(',');
    if (this.selectedRoles?.length) queryParams.roles = this.selectedRoles.join(',');
    if (this.hasTranslationsFilter) queryParams.trans = 'true';
    if (this.selectedTags?.length) queryParams.tags = this.selectedTags.join(',');
    if (this.selectedSort && this.selectedSort !== 'date_desc') queryParams.sort = this.selectedSort;
    if (this.archived) queryParams.archived = 'true';

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

  // Load Data
  reload(then?: () => void) {
    this.isLoading = true;
    this.api.sources({
      page: this.page,
      limit: this.pageSize,
      sort: this.selectedSort,
      q: this.searchQuery?.trim() || undefined,
      owner: this.selectedOwner !== 'all' ? this.selectedOwner : undefined,
      authors: this.selectedAuthors?.length ? this.selectedAuthors.join(',') : undefined,
      codeLangs: this.selectedProgLangs?.length ? this.selectedProgLangs.join(',') : undefined,
      langs: this.selectedLanguages?.length ? this.selectedLanguages.join(',') : undefined,
      roles: this.selectedRoles?.length ? this.selectedRoles.join(',') : undefined,
      trans: this.hasTranslationsFilter ? 'true' : undefined,
      tags: this.selectedTags?.length ? this.selectedTags.join(',') : undefined,
      archived: this.archived,
    }).subscribe(
      (res: any) => {
        this.sources = res.items || [];
        this.filteredSources = this.sources;
        this.totalRecords = res.total || 0;
        if (res.filterOptions) {
          this.serverFilterOptions = res.filterOptions;
        }
        this.isLoading = false;
        then?.();
      },
      (error: any) => {
        console.error('Error fetching sources:', error);
        this.isLoading = false;
      }
    );
  }

  // Source Actions
  create() {
    this.api.create().subscribe(
      (source: any) => this.router.navigate(['/editor', source.id]),
      (error: any) => console.error('Error creating source:', error)
    );
  }

  toggleArchive(source: any) {
    source.archived = !source.archived;
    this.api.update(source).subscribe(
      () => this.reload(),
      (error: any) => console.error('Error toggling archive:', error)
    );
  }

  async preview(source: any) {
    source = await this.api.read(source.id).toPromise();
    this.previewLink = this.activities.previewJsonLink(source, 'source');
    this.showPreview = true;
  }

  clone(source: any) {
    this.confirm.confirm({
      header: 'Confirm Clone',
      message: `Are you sure you want to clone "${source.name || 'this source'}"?`,
      acceptButtonStyleClass: 'p-button-warning p-button-sm',
      rejectButtonStyleClass: 'p-button-plain p-button-sm',
      accept: () => {
        this.api.clone(source.id).subscribe(
          (cloned: any) => this.router.navigate(['/editor', cloned.id]),
          (error: any) => console.error('Error cloning source:', error)
        );
      }
    });
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
    }, 3500);
  }
}
