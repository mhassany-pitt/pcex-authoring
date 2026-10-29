import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppService } from '../app.service';
import { getNavMenuBar, getPreviewLink, getPublishedLink, getTagLabel, getTagClass, getTagStyle } from '../utilities';
import { MessageService } from 'primeng/api';
import { environment } from '../../environments/environment';

export type FilterKV = { label: string; value: number; key?: string };
export type HubQuickFilterSectionKey =
  | 'roles'
  | 'progLangs'
  | 'authors'
  | 'languages'
  | 'options'
  | 'tags';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less']
})
export class HubComponent implements OnInit, OnDestroy {

  getNavMenuBar = getNavMenuBar;
  getPublishedLink = getPublishedLink;
  getTagLabel = getTagLabel;
  getTagClass = getTagClass;
  getTagStyle = getTagStyle;

  previewLink: any;
  showPreview = false;

  activities: any[] = [];
  filteredActivities: any[] = [];
  isLoading = false;

  // Filter models
  searchQuery: string = '';
  selectedAuthors: string[] = [];
  selectedProgLangs: string[] = [];
  selectedLanguages: string[] = [];
  selectedRoles: string[] = [];
  hasTranslationsFilter: boolean = false;
  selectedTags: string[] = [];
  selectedSort: string = 'date_desc';

  searchTimeout: any;
  highlightedId: string | null = null;
  highlightTimeout: any;
  private queryParamsSub?: Subscription;
  isTypingSearch = false;

  // Filter option lists
  availableAuthors: { label: string; value: string }[] = [];
  progLangOptions: { label: string; value: string }[] = [];
  availableLanguages: { label: string; value: string }[] = [];
  availableTags: { label: string; value: string }[] = [];

  // Facet Accordion Sections
  quickFilterSections: Record<HubQuickFilterSectionKey, boolean> = {
    roles: true,
    progLangs: true,
    authors: true,
    languages: false,
    options: false,
    tags: false,
  };

  // Facet counts and availability
  roleKVs: FilterKV[] = [];
  plKVs: FilterKV[] = [];
  authorKVs: FilterKV[] = [];
  langKVs: FilterKV[] = [];
  optionKVs: FilterKV[] = [];
  tagKVs: FilterKV[] = [];

  // Authors inline search & pagination
  authorsQuery = '';
  showAllAuthors = false;
  readonly authorsDefaultLimit = 15;

  // Tags inline search & pagination
  tagsQuery = '';
  showAllTags = false;
  readonly tagsDefaultLimit = 20;

  toggleQuickFilterSection(key: HubQuickFilterSectionKey) {
    this.quickFilterSections[key] = !this.quickFilterSections[key];
  }

  onAuthorsQueryChange(val: string) {
    this.authorsQuery = val || '';
    this.showAllAuthors = false;
  }

  toggleAuthorsView() {
    this.showAllAuthors = !this.showAllAuthors;
    if (this.showAllAuthors) {
      this.quickFilterSections.authors = true;
    }
  }

  get filteredAuthorKVs(): FilterKV[] {
    const q = this.authorsQuery.trim().toLowerCase();
    if (!q) return this.authorKVs;
    return this.authorKVs.filter(kv => kv.label.toLowerCase().includes(q));
  }

  get visibleAuthorKVs(): FilterKV[] {
    const filtered = this.filteredAuthorKVs;
    if (this.showAllAuthors || filtered.length <= this.authorsDefaultLimit) {
      return filtered;
    }
    return filtered.slice(0, this.authorsDefaultLimit);
  }

  get hasMoreAuthors(): boolean {
    return this.filteredAuthorKVs.length > this.authorsDefaultLimit;
  }

  onTagsQueryChange(val: string) {
    this.tagsQuery = val || '';
    this.showAllTags = false;
  }

  toggleTagsView() {
    this.showAllTags = !this.showAllTags;
    if (this.showAllTags) {
      this.quickFilterSections.tags = true;
    }
  }

  get filteredTagKVs(): FilterKV[] {
    const q = this.tagsQuery.trim().toLowerCase();
    if (!q) return this.tagKVs;
    return this.tagKVs.filter(kv => kv.label.toLowerCase().includes(q));
  }

  get visibleTagKVs(): FilterKV[] {
    const filtered = this.filteredTagKVs;
    if (this.showAllTags || filtered.length <= this.tagsDefaultLimit) {
      return filtered;
    }
    return filtered.slice(0, this.tagsDefaultLimit);
  }

  get hasMoreTags(): boolean {
    return this.filteredTagKVs.length > this.tagsDefaultLimit;
  }

  isQuickFilterSelected(field: string, keyOrLabel: string): boolean {
    switch (field) {
      case 'roles':
        return this.selectedRoles.includes(keyOrLabel);
      case 'progLangs':
        return this.selectedProgLangs.includes(keyOrLabel);
      case 'authors':
        return this.selectedAuthors.includes(keyOrLabel);
      case 'languages':
        return this.selectedLanguages.includes(keyOrLabel);
      case 'options':
        return this.hasTranslationsFilter;
      case 'tags':
        return this.selectedTags.includes(keyOrLabel);
      default:
        return false;
    }
  }

  isQuickFilterAvailable(field: string, keyOrLabel: string): boolean {
    let list: FilterKV[] = [];
    switch (field) {
      case 'roles': list = this.roleKVs; break;
      case 'progLangs': list = this.plKVs; break;
      case 'authors': list = this.authorKVs; break;
      case 'languages': list = this.langKVs; break;
      case 'options': list = this.optionKVs; break;
      case 'tags': list = this.tagKVs; break;
    }
    const found = list.find(kv => (kv.key || kv.label) === keyOrLabel || kv.label === keyOrLabel);
    return !!(found && found.value > 0);
  }

  toggleQuickFilter(field: string, facet: FilterKV) {
    const key = facet.key || facet.label;
    switch (field) {
      case 'roles':
        if (this.selectedRoles.includes(key)) {
          this.selectedRoles = this.selectedRoles.filter(r => r !== key);
        } else {
          this.selectedRoles = [...this.selectedRoles, key];
        }
        break;
      case 'progLangs':
        if (this.selectedProgLangs.includes(key)) {
          this.selectedProgLangs = this.selectedProgLangs.filter(l => l !== key);
        } else {
          this.selectedProgLangs = [...this.selectedProgLangs, key];
        }
        break;
      case 'authors':
        if (this.selectedAuthors.includes(key)) {
          this.selectedAuthors = this.selectedAuthors.filter(a => a !== key);
        } else {
          this.selectedAuthors = [...this.selectedAuthors, key];
        }
        break;
      case 'languages':
        if (this.selectedLanguages.includes(key)) {
          this.selectedLanguages = this.selectedLanguages.filter(l => l !== key);
        } else {
          this.selectedLanguages = [...this.selectedLanguages, key];
        }
        break;
      case 'options':
        this.hasTranslationsFilter = !this.hasTranslationsFilter;
        break;
      case 'tags':
        if (this.selectedTags.includes(key)) {
          this.selectedTags = this.selectedTags.filter(t => t !== key);
        } else {
          this.selectedTags = [...this.selectedTags, key];
        }
        break;
    }
    this.onFilterChange();
  }

  roleOptions = [
    { label: 'Worked-Example', value: 'example' },
    { label: 'Challenge', value: 'challenge' }
  ];

  sortOptions = [
    { label: 'Recently Modified', value: 'updated_desc' },
    { label: 'Date Created (Newest)', value: 'date_desc' },
    { label: 'Date Created (Oldest)', value: 'date_asc' },
    { label: 'Name (A – Z)', value: 'name_asc' },
    { label: 'Name (Z – A)', value: 'name_desc' },
    { label: 'Most Bundle Items', value: 'items_desc' },
    { label: 'Fewest Bundle Items', value: 'items_asc' }
  ];

  integrationToggles: { [key: string]: boolean } = {};
  expandedItems: { [key: string]: boolean } = {};

  cloningActivity: any = null;
  cloning: boolean = false;

  get isLoggedIn() { return !!this.app.user; }

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

  getItemTypeLabel(type: string) {
    switch (type) {
      case 'example': return 'Worked-Example';
      case 'challenge': return 'Challenge';
      default: return type;
    }
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery?.trim() ||
      this.selectedAuthors?.length ||
      this.selectedProgLangs?.length ||
      this.selectedLanguages?.length ||
      this.selectedRoles?.length ||
      this.hasTranslationsFilter ||
      this.selectedTags?.length
    );
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchQuery?.trim()) count++;
    if (this.selectedAuthors?.length) count += this.selectedAuthors.length;
    if (this.selectedProgLangs?.length) count += this.selectedProgLangs.length;
    if (this.selectedLanguages?.length) count += this.selectedLanguages.length;
    if (this.selectedRoles?.length) count += this.selectedRoles.length;
    if (this.hasTranslationsFilter) count++;
    if (this.selectedTags?.length) count += this.selectedTags.length;
    return count;
  }

  getRoleLabel(role: string): string {
    const found = this.roleOptions.find(o => o.value === role);
    return found ? found.label : role;
  }

  getAuthorLabel(email: string): string {
    const found = this.availableAuthors.find(a => a.value === email);
    return found ? found.label : email;
  }

  constructor(
    private http: HttpClient,
    public router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private title: Title,
    public app: AppService,
    private messages: MessageService,
  ) { }

  ngOnInit(): void {
    this.title.setTitle('WEAT Hub');
    this.parseQueryParams(this.route.snapshot.queryParams);
    this.fetchActivities();

    this.queryParamsSub = this.route.queryParams.subscribe(params => {
      const changed = this.parseQueryParams(params);
      if (changed) {
        this.applyFilters();
      }
      const id = params['id'];
      if (id && id !== this.highlightedId) {
        this.highlightAndScroll(id);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
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
    if (!this.isTypingSearch) {
      if (newQuery !== this.searchQuery) {
        this.searchQuery = newQuery;
        changed = true;
      }
    }

    const newAuthors = parseArray('authors', 'author');
    if (!arraysEqual(newAuthors, this.selectedAuthors)) {
      this.selectedAuthors = newAuthors;
      changed = true;
    }

    const newRoles = parseArray('roles', 'role', 'types', 'type');
    if (!arraysEqual(newRoles, this.selectedRoles)) {
      this.selectedRoles = newRoles;
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

    return changed;
  }

  updateUrlParams(replace = true) {
    const queryParams: any = {};
    if (this.searchQuery?.trim()) queryParams.q = this.searchQuery.trim();
    if (this.selectedAuthors?.length) queryParams.authors = this.selectedAuthors.join(',');
    if (this.selectedRoles?.length) queryParams.roles = this.selectedRoles.join(',');
    if (this.selectedProgLangs?.length) queryParams.codeLangs = this.selectedProgLangs.join(',');
    if (this.selectedLanguages?.length) queryParams.langs = this.selectedLanguages.join(',');
    if (this.hasTranslationsFilter) queryParams.trans = 'true';
    if (this.selectedTags?.length) queryParams.tags = this.selectedTags.join(',');
    if (this.selectedSort && this.selectedSort !== 'date_desc') queryParams.sort = this.selectedSort;

    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: replace,
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
    }, 3000);
  }

  fetchActivities() {
    this.isLoading = true;
    this.http.get(`${environment.apiUrl}/hub`).subscribe({
      next: (activities: any) => {
        this.activities = (activities || []).map((activity: any) => {
          const actLang = activity.iso_language_code ? this.getLanguageName(activity.iso_language_code) : '';
          activity.iso_language_code_name = actLang;
          activity.author_name = activity.author?.fullname || activity.author?.email || 'Unknown';
          
          const itemsText = (activity.items || []).map((item: any) => {
            const itemLang = item.details?.iso_language_code ? this.getLanguageName(item.details.iso_language_code) : '';
            const itemProg = item.details?.language || '';
            const tags = (item.details?.tags || []).join(' ');
            return `${item.details?.name || ''} ${item.details?.untr_name || ''} ${item.details?.description || ''} ${item.details?.untr_description || ''} ${itemProg} ${itemLang} ${tags}`;
          }).join(' ');

          const collabs = (activity.collaborators || []).join(' ');

          activity._filter_details = `${activity.id} ${activity.name || ''} ${activity.untr_name || ''} ${activity.description || ''} ${activity.untr_description || ''} ${actLang} ${activity.author_name} ${activity.author?.email || ''} ${collabs} ${itemsText}`.toLowerCase();
          return activity;
        });

        this.populateFilterOptions();
        this.applyFilters();
        this.isLoading = false;

        const id = this.route.snapshot.queryParams['id'];
        if (id) {
          this.highlightAndScroll(id);
        }
      },
      error: (error: any) => {
        console.error('Failed to load hub activities', error);
        this.isLoading = false;
      }
    });
  }

  populateFilterOptions() {
    const authorsMap = new Map<string, string>();
    const progLangsSet = new Set<string>();
    const languagesSet = new Set<string>();
    const tagsSet = new Set<string>();

    this.activities.forEach(activity => {
      if (activity.author?.email) {
        const label = activity.author.fullname
          ? `${activity.author.fullname} (${activity.author.email})`
          : activity.author.email;
        authorsMap.set(activity.author.email, label);
      }

      if (activity.iso_language_code) {
        languagesSet.add(activity.iso_language_code);
      }

      (activity.items || []).forEach((item: any) => {
        if (item.details?.language) {
          progLangsSet.add(item.details.language);
        }
        if (item.details?.iso_language_code) {
          languagesSet.add(item.details.iso_language_code);
        }
        (item.details?.tags || []).forEach((tag: string) => {
          const clean = getTagLabel(tag);
          if (clean) tagsSet.add(clean);
        });
      });
    });

    this.availableAuthors = Array.from(authorsMap.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));

    this.progLangOptions = Array.from(progLangsSet)
      .map(lang => ({ label: lang, value: lang }))
      .sort((a, b) => a.label.localeCompare(b.label));

    this.availableLanguages = Array.from(languagesSet)
      .map(iso => ({ label: this.getLanguageName(iso) || iso, value: iso }))
      .sort((a, b) => a.label.localeCompare(b.label));

    this.availableTags = Array.from(tagsSet)
      .map(tag => ({ label: tag, value: tag }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  applyFilters() {
    this.filteredActivities = this.activities.filter(activity =>
      this.matchesFiltersExcept(activity, '')
    );

    // Sorting
    this.filteredActivities.sort((a, b) => {
      switch (this.selectedSort) {
        case 'updated_desc':
          return this.getUpdatedTime(b) - this.getUpdatedTime(a);
        case 'updated_asc':
          return this.getUpdatedTime(a) - this.getUpdatedTime(b);
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

    this.refreshAvailableFacetLabels();
  }

  matchesFiltersExcept(act: any, excludedField: string): boolean {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (excludedField !== 'q' && q) {
      if (!act._filter_details?.includes(q)) return false;
    }
    if (excludedField !== 'authors' && this.selectedAuthors?.length) {
      if (!act.author?.email || !this.selectedAuthors.includes(act.author.email)) return false;
    }
    if (excludedField !== 'roles' && this.selectedRoles?.length) {
      const hasMatchingRole = (act.items || []).some((item: any) =>
        item.type && this.selectedRoles.includes(item.type)
      );
      if (!hasMatchingRole) return false;
    }
    if (excludedField !== 'progLangs' && this.selectedProgLangs?.length) {
      const hasMatchingProgLang = (act.items || []).some((item: any) =>
        item.details?.language && this.selectedProgLangs.includes(item.details.language)
      );
      if (!hasMatchingProgLang) return false;
    }
    if (excludedField !== 'languages' && this.selectedLanguages?.length) {
      const bundleCode = act.iso_language_code;
      const bundleMatch = bundleCode && this.selectedLanguages.includes(bundleCode);
      const itemMatch = (act.items || []).some((item: any) =>
        item.details?.iso_language_code && this.selectedLanguages.includes(item.details.iso_language_code)
      );
      if (!bundleMatch && !itemMatch) return false;
    }
    if (excludedField !== 'trans' && this.hasTranslationsFilter) {
      if (!this.matchesTranslations(act, true)) return false;
    }
    if (excludedField !== 'tags' && this.selectedTags?.length) {
      const actTags = new Set<string>();
      (act.items || []).forEach((item: any) => {
        (item.details?.tags || []).forEach((t: string) => actTags.add(getTagLabel(t)));
      });
      const hasTagMatch = this.selectedTags.some(t => actTags.has(t));
      if (!hasTagMatch) return false;
    }
    return true;
  }

  matchesTranslations(act: any, req: boolean): boolean {
    if (!req) return true;
    if (act.translations && typeof act.translations === 'object' && Object.keys(act.translations).length > 0) {
      return true;
    }
    return (act.items || []).some((item: any) =>
      item.details?.translations && typeof item.details.translations === 'object' && Object.keys(item.details.translations).length > 0
    );
  }

  refreshAvailableFacetLabels() {
    // 1. Roles counts (Worked-Example, Challenge)
    const matchingRolesActs = this.activities.filter(act => this.matchesFiltersExcept(act, 'roles'));
    let exCount = 0;
    let chCount = 0;
    matchingRolesActs.forEach(act => {
      let hasEx = false;
      let hasCh = false;
      (act.items || []).forEach((item: any) => {
        if (item.type === 'example') hasEx = true;
        if (item.type === 'challenge') hasCh = true;
      });
      if (hasEx) exCount++;
      if (hasCh) chCount++;
    });
    this.roleKVs = [
      { label: 'Worked-Example', key: 'example', value: exCount },
      { label: 'Challenge', key: 'challenge', value: chCount },
    ];

    // 2. Programming Languages counts
    const matchingPlActs = this.activities.filter(act => this.matchesFiltersExcept(act, 'progLangs'));
    const plCounts = new Map<string, number>();
    this.progLangOptions.forEach(opt => plCounts.set(opt.value, 0));
    matchingPlActs.forEach(act => {
      const actLangs = new Set<string>();
      (act.items || []).forEach((item: any) => {
        if (item.details?.language) actLangs.add(item.details.language);
      });
      actLangs.forEach(lang => {
        plCounts.set(lang, (plCounts.get(lang) || 0) + 1);
      });
    });
    this.plKVs = Array.from(plCounts.entries())
      .map(([lang, count]) => ({ label: lang.toUpperCase(), key: lang, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    // 3. Authors counts
    const matchingAuthorActs = this.activities.filter(act => this.matchesFiltersExcept(act, 'authors'));
    const authorCounts = new Map<string, number>();
    this.availableAuthors.forEach(a => authorCounts.set(a.value, 0));
    matchingAuthorActs.forEach(act => {
      if (act.author?.email) {
        authorCounts.set(act.author.email, (authorCounts.get(act.author.email) || 0) + 1);
      }
    });
    this.authorKVs = this.availableAuthors
      .map(a => ({
        label: a.label,
        key: a.value,
        value: authorCounts.get(a.value) || 0,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    // 4. Natural Languages counts
    const matchingLangActs = this.activities.filter(act => this.matchesFiltersExcept(act, 'languages'));
    const langCounts = new Map<string, number>();
    this.availableLanguages.forEach(l => langCounts.set(l.value, 0));
    matchingLangActs.forEach(act => {
      const actCodes = new Set<string>();
      if (act.iso_language_code) actCodes.add(act.iso_language_code);
      (act.items || []).forEach((item: any) => {
        if (item.details?.iso_language_code) actCodes.add(item.details.iso_language_code);
      });
      actCodes.forEach(code => {
        langCounts.set(code, (langCounts.get(code) || 0) + 1);
      });
    });
    this.langKVs = this.availableLanguages
      .map(l => ({
        label: l.label,
        key: l.value,
        value: langCounts.get(l.value) || 0,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    // 5. Options (Has Translations)
    const matchingTransActs = this.activities.filter(act => this.matchesFiltersExcept(act, 'trans'));
    let transCount = 0;
    matchingTransActs.forEach(act => {
      if (this.matchesTranslations(act, true)) transCount++;
    });
    this.optionKVs = [
      { label: 'Has Translations', key: 'trans', value: transCount },
    ];

    // 6. Tags counts
    const matchingTagActs = this.activities.filter(act => this.matchesFiltersExcept(act, 'tags'));
    const tagCounts = new Map<string, number>();
    this.availableTags.forEach(t => tagCounts.set(t.value, 0));
    matchingTagActs.forEach(act => {
      const actTags = new Set<string>();
      (act.items || []).forEach((item: any) => {
        (item.details?.tags || []).forEach((t: string) => {
          const clean = getTagLabel(t);
          if (clean) actTags.add(clean);
        });
      });
      actTags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    this.tagKVs = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ label: tag, key: tag, value: count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  getCreationDate(activity: any): Date | null {
    if (activity?.created_at) {
      const d = new Date(activity.created_at);
      if (!isNaN(d.getTime())) return d;
    }
    if (activity?.updated_at) {
      const d = new Date(activity.updated_at);
      if (!isNaN(d.getTime())) return d;
    }
    if (activity?.id && typeof activity.id === 'string' && activity.id.length >= 8) {
      try {
        const timestamp = parseInt(activity.id.substring(0, 8), 16) * 1000;
        const d = new Date(timestamp);
        const yr = d.getFullYear();
        if (!isNaN(d.getTime()) && yr >= 2015 && yr <= new Date().getFullYear() + 1) return d;
      } catch (e) {}
    }
    return null;
  }

  getCreationTime(activity: any): number {
    const d = this.getCreationDate(activity);
    return d ? d.getTime() : 0;
  }

  getUpdatedDate(activity: any): Date | null {
    if (activity?.updated_at) {
      const d = new Date(activity.updated_at);
      if (!isNaN(d.getTime())) return d;
    }
    return this.getCreationDate(activity);
  }

  getUpdatedTime(activity: any): number {
    const d = this.getUpdatedDate(activity);
    return d ? d.getTime() : 0;
  }

  onSearchInput() {
    this.isTypingSearch = true;
    this.applyFilters();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchTimeout = null;
      this.updateUrlParams(true).finally(() => {
        if (!this.searchTimeout) {
          this.isTypingSearch = false;
        }
      });
    }, 250);
  }

  onFilterChange() {
    this.applyFilters();
    this.updateUrlParams(false);
  }

  clearSearch() {
    this.isTypingSearch = false;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this.searchQuery = '';
    this.applyFilters();
    this.updateUrlParams(false);
  }

  clearFilters() {
    this.isTypingSearch = false;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this.searchQuery = '';
    this.selectedAuthors = [];
    this.selectedProgLangs = [];
    this.selectedLanguages = [];
    this.selectedRoles = [];
    this.hasTranslationsFilter = false;
    this.selectedTags = [];
    this.selectedSort = 'date_desc';
    this.authorsQuery = '';
    this.showAllAuthors = false;
    this.tagsQuery = '';
    this.showAllTags = false;
    this.applyFilters();
    this.updateUrlParams(false);
  }

  removeAuthor(author: string) {
    this.selectedAuthors = (this.selectedAuthors || []).filter(a => a !== author);
    this.onFilterChange();
  }

  removeProgLang(lang: string) {
    this.selectedProgLangs = (this.selectedProgLangs || []).filter(l => l !== lang);
    this.onFilterChange();
  }

  removeLanguage(lang: string) {
    this.selectedLanguages = (this.selectedLanguages || []).filter(l => l !== lang);
    this.onFilterChange();
  }

  removeRole(role: string) {
    this.selectedRoles = (this.selectedRoles || []).filter(r => r !== role);
    this.onFilterChange();
  }

  clearTranslationsFilter() {
    this.hasTranslationsFilter = false;
    this.onFilterChange();
  }

  removeTag(tag: string) {
    this.selectedTags = (this.selectedTags || []).filter(t => t !== tag);
    this.onFilterChange();
  }

  toggleIntegration(activityId: string) {
    this.integrationToggles[activityId] = !this.integrationToggles[activityId];
  }

  toggleExpandedItems(activityId: string) {
    this.expandedItems[activityId] = !this.expandedItems[activityId];
  }

  async preview(activity: any) {
    this.previewLink = this.sanitizer.bypassSecurityTrustResourceUrl(
      getPreviewLink('?load=' + encodeURIComponent(`${environment.apiUrl}/hub/${activity.id}?_t=${new Date().getTime()}`))
    );
    this.showPreview = true;
  }

  copyLink(activity: any) {
    const link = this.getPublishedLink(activity, 'html');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        this.messages.add({ severity: 'info', summary: 'Copied', detail: 'Embed link copied to clipboard!' });
      });
    }
  }

  selectActivity2Clone(activity: any) {
    this.cloningActivity = JSON.parse(JSON.stringify(activity));
    delete this.cloningActivity._filter_details;
    (this.cloningActivity.items || []).forEach((i: any) => i.cloneItem = true);
  }

  submitClone() {
    this.cloning = true;
    this.http.post(`${environment.apiUrl}/hub/clone`, this.cloningActivity, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.cloningActivity = null;
        this.messages.add({ severity: 'success', summary: 'Success', detail: 'Bundle cloned successfully!' });
      },
      error: (error: any) => {
        console.error(error);
        this.messages.add({ severity: 'error', summary: 'Error', detail: 'Failed to clone bundle.' });
      },
      complete: () => this.cloning = false,
    });
  }
}
