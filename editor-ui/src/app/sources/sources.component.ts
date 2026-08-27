import { Component, OnInit } from '@angular/core';
import { SourcesService } from '../sources.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivitiesService } from '../activities.service';
import { AppService } from '../app.service';
import { ConfirmationService } from 'primeng/api';
import { getTagLabel, getTagClass, getTagStyle } from '../utilities';

@Component({
  selector: 'app-sources',
  templateUrl: './sources.component.html',
  styleUrls: ['./sources.component.less']
})
export class SourcesComponent implements OnInit {

  getTagLabel = getTagLabel;
  getTagClass = getTagClass;
  getTagStyle = getTagStyle;

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

  // Data
  sources: any[] = [];
  filteredSources: any[] = [];
  isLoading = false;

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

  // Preview Dialog
  previewLink: any;
  showPreview = false;

  // Row Highlight
  highlightedId: string | null = null;
  highlightTimeout: any;

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
  ) { }

  ngOnInit(): void {
    // Read query params on initial load
    const params = this.route.snapshot.queryParams;
    if (params['q']) this.searchQuery = params['q'];
    if (params['owner'] && ['all', 'mine', 'shared'].includes(params['owner'])) this.selectedOwner = params['owner'];
    if (params['authors']) this.selectedAuthors = params['authors'].split(',').filter(Boolean);
    if (params['codeLangs']) this.selectedProgLangs = params['codeLangs'].split(',').filter(Boolean);
    if (params['langs']) this.selectedLanguages = params['langs'].split(',').filter(Boolean);
    if (params['roles']) this.selectedRoles = params['roles'].split(',').filter(Boolean);
    if (params['trans'] === 'true') this.hasTranslationsFilter = true;
    if (params['tags']) this.selectedTags = params['tags'].split(',').filter(Boolean);
    if (params['sort']) this.selectedSort = params['sort'];
    if (params['archived'] === 'true') this.archived = true;

    this.reload(() => {
      const id = this.route.snapshot.queryParams['id'];
      if (id) {
        this.highlightAndScroll(id);
      }
    });

    this.route.queryParams.subscribe(p => {
      const id = p['id'];
      if (id && id !== this.highlightedId) {
        this.highlightAndScroll(id);
      }
    });
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

  // Dynamic Options Extracted from Sources Data
  get availableAuthors(): { label: string; value: string }[] {
    const authors = new Set<string>();
    for (const s of this.sources || []) {
      if (s.user) authors.add(s.user);
    }
    return Array.from(authors)
      .sort((a, b) => a.localeCompare(b))
      .map(u => ({
        label: u === this.app.user?.email ? `${u} (you)` : u,
        value: u,
      }));
  }

  get progLangOptions(): { label: string; value: string }[] {
    const langs = new Set<string>();
    for (const s of this.sources || []) {
      if (s.language) langs.add(s.language);
    }
    return Array.from(langs)
      .sort((a, b) => a.localeCompare(b))
      .map(l => ({ label: l.toUpperCase(), value: l }));
  }

  get availableLanguages(): { label: string; value: string }[] {
    const codes = new Set<string>();
    for (const s of this.sources || []) {
      if (s.iso_language_code) codes.add(s.iso_language_code);
    }
    return Array.from(codes)
      .map(code => ({
        label: this.getLanguageName(code) || code,
        value: code,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get availableTags(): { label: string; value: string }[] {
    const tags = new Set<string>();
    for (const s of this.sources || []) {
      if (Array.isArray(s.tags)) {
        for (const t of s.tags) {
          const clean = getTagLabel(t);
          if (clean) tags.add(clean);
        }
      }
    }
    return Array.from(tags)
      .sort((a, b) => a.localeCompare(b))
      .map(t => ({ label: t, value: t }));
  }

  // Filter Removal Helpers
  clearFilters() {
    this.searchQuery = '';
    this.selectedOwner = 'all';
    this.selectedAuthors = [];
    this.selectedProgLangs = [];
    this.selectedLanguages = [];
    this.selectedRoles = [];
    this.hasTranslationsFilter = false;
    this.selectedTags = [];
    this.selectedSort = 'date_desc';
    this.onFilterChange();
  }

  clearSearch() {
    this.searchQuery = '';
    this.onSearchInput();
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
    this.reload();
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

  // Core Filtering & Sorting
  applyFilters() {
    const userEmail = this.app.user?.email?.toLowerCase();
    const query = this.searchQuery?.trim().toLowerCase();

    this.filteredSources = (this.sources || []).filter(source => {
      // 1. Ownership filter
      if (this.selectedOwner === 'mine') {
        if (source.user?.toLowerCase() !== userEmail) return false;
      } else if (this.selectedOwner === 'shared') {
        const isOwner = source.user?.toLowerCase() === userEmail;
        const isCollab = (source.collaborator_emails || []).some(
          (c: string) => c.toLowerCase() === userEmail
        );
        if (!(!isOwner && isCollab)) return false;
      }

      // 2. Authors filter
      if (this.selectedAuthors?.length) {
        if (!this.selectedAuthors.includes(source.user)) return false;
      }

      // 3. Programming Languages filter
      if (this.selectedProgLangs?.length) {
        if (!source.language || !this.selectedProgLangs.includes(source.language)) return false;
      }

      // 4. Natural Languages filter
      if (this.selectedLanguages?.length) {
        if (!source.iso_language_code || !this.selectedLanguages.includes(source.iso_language_code)) return false;
      }

      // 5. Role filter
      if (this.selectedRoles?.length) {
        const blanks = source.blank_lines_count || 0;
        const matchesExample = this.selectedRoles.includes('example') && blanks === 0;
        const matchesChallenge = this.selectedRoles.includes('challenge') && blanks > 0;
        if (!matchesExample && !matchesChallenge) return false;
      }

      // 6. Translations filter
      if (this.hasTranslationsFilter) {
        const hasTrans = source.translations && Object.keys(source.translations).length > 0;
        if (!hasTrans) return false;
      }

      // 7. Tags filter
      if (this.selectedTags?.length) {
        const sourceTags = new Set((source.tags || []).map((t: string) => getTagLabel(t)));
        const hasTagMatch = this.selectedTags.some(t => sourceTags.has(t));
        if (!hasTagMatch) return false;
      }

      // 8. Keyword search filter
      if (query) {
        const details = (source._filter_details || '').toLowerCase();
        if (!details.includes(query)) return false;
      }

      return true;
    });

    // Sorting
    this.filteredSources.sort((a, b) => {
      switch (this.selectedSort) {
        case 'date_asc':
          return this.getCreationTime(a) - this.getCreationTime(b);
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'blanks_desc':
          return (b.blank_lines_count || 0) - (a.blank_lines_count || 0);
        case 'blanks_asc':
          return (a.blank_lines_count || 0) - (b.blank_lines_count || 0);
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
    this.applyFilters();
    this.updateUrlParams(true);
  }

  onFilterChange() {
    this.applyFilters();
    this.updateUrlParams(false);
  }

  // Load Data
  reload(then?: () => void) {
    this.isLoading = true;
    this.api.sources({ archived: this.archived }).subscribe(
      (sources: any) => {
        this.sources = sources.map((source: any) => {
          source._filter_details = [
            source.name,
            source.description,
            source.language,
            this.getLanguageName(source.iso_language_code),
            ...(source.tags || []).map((t: string) => getTagLabel(t)),
            ...(source.tags || []),
            source.user,
            ...(source.collaborator_emails || [])
          ].filter(Boolean).join(' ');
          return source;
        });
        this.applyFilters();
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
