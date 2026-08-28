import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppService } from '../app.service';
import { getNavMenuBar, getPreviewLink, getPublishedLink, getTagLabel, getTagClass, getTagStyle } from '../utilities';
import { MessageService } from 'primeng/api';
import { environment } from '../../environments/environment';

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

  // Filter option lists
  availableAuthors: { label: string; value: string }[] = [];
  progLangOptions: { label: string; value: string }[] = [];
  availableLanguages: { label: string; value: string }[] = [];
  availableTags: { label: string; value: string }[] = [];

  roleOptions = [
    { label: 'Worked-Example', value: 'example' },
    { label: 'Challenge', value: 'challenge' }
  ];

  sortOptions = [
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

    this.router.navigate([], {
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
            return `${item.details?.name || ''} ${item.details?.description || ''} ${itemProg} ${itemLang} ${tags}`;
          }).join(' ');

          const collabs = (activity.collaborators || []).join(' ');

          activity._filter_details = `${activity.id} ${activity.name || ''} ${actLang} ${activity.author_name} ${activity.author?.email || ''} ${collabs} ${itemsText}`.toLowerCase();
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
    const query = (this.searchQuery || '').trim().toLowerCase();

    this.filteredActivities = this.activities.filter(activity => {
      // 1. Authors filter
      if (this.selectedAuthors?.length) {
        if (!activity.author?.email || !this.selectedAuthors.includes(activity.author.email)) {
          return false;
        }
      }

      // 2. Programming Languages filter
      if (this.selectedProgLangs?.length) {
        const hasMatchingProgLang = (activity.items || []).some((item: any) =>
          item.details?.language && this.selectedProgLangs.includes(item.details.language)
        );
        if (!hasMatchingProgLang) return false;
      }

      // 3. Natural Languages filter
      if (this.selectedLanguages?.length) {
        const hasMatchingLanguage = (activity.items || []).some((item: any) =>
          item.details?.iso_language_code && this.selectedLanguages.includes(item.details.iso_language_code)
        );
        if (!hasMatchingLanguage) return false;
      }

      // 4. Role filter
      if (this.selectedRoles?.length) {
        const hasMatchingRole = (activity.items || []).some((item: any) =>
          item.type && this.selectedRoles.includes(item.type)
        );
        if (!hasMatchingRole) return false;
      }

      // 5. Translations filter
      if (this.hasTranslationsFilter) {
        const hasTranslations = (activity.items || []).some((item: any) =>
          item.details?.translations && Object.keys(item.details.translations).length > 0
        );
        if (!hasTranslations) return false;
      }

      // 6. Tags filter
      if (this.selectedTags?.length) {
        const bundleTags = new Set<string>();
        (activity.items || []).forEach((item: any) => {
          (item.details?.tags || []).forEach((t: string) => bundleTags.add(getTagLabel(t)));
        });
        const hasTagMatch = this.selectedTags.some(t => bundleTags.has(t));
        if (!hasTagMatch) return false;
      }

      // 7. Search query filter
      if (query) {
        if (!activity._filter_details?.includes(query)) return false;
      }

      return true;
    });

    // Sorting
    this.filteredActivities.sort((a, b) => {
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

  getCreationDate(activity: any): Date | null {
    if (activity.created_at) return new Date(activity.created_at);
    if (activity.id && typeof activity.id === 'string' && activity.id.length === 24) {
      const timestamp = parseInt(activity.id.substring(0, 8), 16) * 1000;
      if (!isNaN(timestamp)) return new Date(timestamp);
    }
    return null;
  }

  getCreationTime(activity: any): number {
    const d = this.getCreationDate(activity);
    return d ? d.getTime() : 0;
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

  clearSearch() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = '';
    this.onFilterChange();
  }

  clearFilters() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = '';
    this.selectedAuthors = [];
    this.selectedProgLangs = [];
    this.selectedLanguages = [];
    this.selectedRoles = [];
    this.hasTranslationsFilter = false;
    this.selectedTags = [];
    this.selectedSort = 'date_desc';
    this.onFilterChange();
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
