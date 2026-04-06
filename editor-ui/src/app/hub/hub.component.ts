import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { getNavMenuBar, getPreviewLink, getPublishedLink } from '../utilities';
import { MessageService, FilterService } from 'primeng/api';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.less']
})
export class HubComponent implements OnInit {

  getNavMenuBar = getNavMenuBar;
  getPublishedLink = getPublishedLink;

  previewLink: any;
  showPreview = false;

  activities: any[] = [];
  globalQuery: string = '';
  searchTimeout: any;

  integrationToggles: any = {};
  integrationOptions = [{ label: 'VIEW LINK', value: 'html' }];

  cloningActivity: any = null;
  cloning: boolean = false;

  selectedKVs: { [key: string]: any } = {};
  langKVs: any[] = [];
  authorKVs: any[] = [];
  progLangKVs: any[] = [];
  availableFacetLabels: { [key: string]: Set<string> } = {};
  facetCounts: { [key: string]: Map<string, number> } = {};
  collapsedFacets: { [key: string]: boolean } = {};

  quickFilterSections: { [key: string]: boolean } = {
    actLang: true,
    author: true,
    progLang: true,
  };

  get isLoggedIn() { return !!this.app.user; }

  get quickFiltersExpanded() { return true; }

  toggleQuickFilterSection(section: string) {
    this.quickFilterSections[section] = !this.quickFilterSections[section];
  }

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
      case 'challenge': return 'Code-Completion Problem';
      default: return type;
    }
  }

  constructor(
    private http: HttpClient,
    public router: Router,
    private sanitizer: DomSanitizer,
    private title: Title,
    public app: AppService,
    private messages: MessageService,
    private filterService: FilterService,
  ) { }

  getCurrentRoute() {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    this.title.setTitle('WEAT Hub');

    this.filterService.register('sourceProgLangMatch', (value: any, filters: string[]) => {
      if (!filters || !filters.length) return true;
      const itemProgs = (value || []).map((i: any) => i.details?.language).filter((l: string) => !!l);
      return filters.some(f => itemProgs.includes(f));
    });

    this.search('');
  }

  reloadFilterKVs(activities: any[]) {
    // Basic lists extraction
    const actLangs = new Set<string>();
    const authors = new Set<string>();
    const progLangs = new Set<string>();

    activities.forEach(activity => {
      actLangs.add(activity.iso_language_code_name);
      authors.add(activity.author_name);
      activity.items.forEach((item: any) => {
        if (item.details?.language) progLangs.add(item.details.language);
      });
    });

    this.langKVs = Array.from(actLangs).map(label => ({ label }));
    this.authorKVs = Array.from(authors).map(label => ({ label }));
    this.progLangKVs = Array.from(progLangs).map(label => ({ label }));

    this.refreshAvailableFacetLabels(activities);
  }

  private matchesFilters(activity: any, excludeField?: string) {
    if (this.globalQuery) {
      const q = this.globalQuery.toLowerCase();
      if (!activity._filter_idnamedescription?.toLowerCase().includes(q)) return false;
    }

    for (const field of Object.keys(this.selectedKVs)) {
      if (field === 'count' || field === excludeField) continue;
      const selected = this.selectedKVs[field];
      if (!selected || !selected.length) continue;
      const labels = selected.map((s: any) => s.label);

      if (field === 'iso_language_code_name') {
        if (!labels.includes(activity.iso_language_code_name)) return false;
      } else if (field === 'author_name') {
        if (!labels.includes(activity.author_name)) return false;
      } else if (field === 'item_prog_lang') {
        const itemProgs = activity.items.map((i: any) => i.details?.language).filter((l: string) => !!l);
        if (!labels.some((l: string) => itemProgs.includes(l))) return false;
      }
    }
    return true;
  }

  getFacetCount(field: string, label: string) {
    const list = this.activities.filter(a => this.matchesFilters(a, field));
    let count = 0;
    list.forEach(activity => {
      if (field === 'iso_language_code_name') {
        if (activity.iso_language_code_name === label) count++;
      } else if (field === 'author_name') {
        if (activity.author_name === label) count++;
      } else if (field === 'item_prog_lang') {
        const itemProgs = activity.items.map((i: any) => i.details?.language).filter((l: string) => !!l);
        if (itemProgs.includes(label)) count++;
      }
    });
    return count;
  }

  refreshAvailableFacetLabels(filteredActivities: any[]) {
    // We don't just use filteredActivities because we need to know what WOULD be available
    // if we changed a selection in one specific facet.
    
    const fields = ['iso_language_code_name', 'author_name', 'item_prog_lang'];
    const availability: { [key: string]: Set<string> } = {};
    
    fields.forEach(field => {
      const availableSet = new Set<string>();
      const potentialMatches = this.activities.filter(a => this.matchesFilters(a, field));
      
      potentialMatches.forEach(activity => {
        if (field === 'iso_language_code_name') availableSet.add(activity.iso_language_code_name);
        if (field === 'author_name') availableSet.add(activity.author_name);
        
        activity.items.forEach((item: any) => {
          if (field === 'item_prog_lang' && item.details?.language) availableSet.add(item.details.language);
        });
      });
      availability[field] = availableSet;
    });

    this.availableFacetLabels = availability;

    this.langKVs.forEach(kv => kv.count = this.getFacetCount('iso_language_code_name', kv.label));
    this.authorKVs.forEach(kv => kv.count = this.getFacetCount('author_name', kv.label));
    this.progLangKVs.forEach(kv => kv.count = this.getFacetCount('item_prog_lang', kv.label));

    this.langKVs.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    this.authorKVs.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    this.progLangKVs.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  toggleQuickFilter(table: any, field: string, facet: any) {
    const selected = this.selectedKVs[field] || [];
    const index = selected.findIndex((s: any) => s.label === facet.label);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(facet);
    }
    this.selectedKVs[field] = [...selected];
    this.selectedKVs['count'] = Object.keys(this.selectedKVs).filter(k => k !== 'count').reduce((sum, key) => sum + this.selectedKVs[key].length, 0);

    this.applyFilters(table);
  }

  applyFilters(table: any) {
    Object.keys(this.selectedKVs).forEach(field => {
      if (field === 'count') return;
      const values = this.selectedKVs[field].map((f: any) => f.label);
      
      switch (field) {
        case 'item_prog_lang':
          table.filter(values.length ? values : null, 'items', 'sourceProgLangMatch');
          break;
        case 'iso_language_code_name':
          table.filter(values.length ? values : null, 'iso_language_code_name', 'in');
          break;
        case 'author_name':
          table.filter(values.length ? values : null, 'author_name', 'in');
          break;
      }
    });
    this.refreshAvailableFacetLabels(table.filteredValue || this.activities);
  }

  isQuickFilterSelected(field: string, label: string) {
    return (this.selectedKVs[field] || []).some((s: any) => s.label === label);
  }

  isQuickFilterAvailable(field: string, label: string) {
    return (this.availableFacetLabels[field] || new Set()).has(label);
  }

  clearQuickFilters(table: any) {
    this.selectedKVs = {};
    table.reset();
    this.activities.forEach(a => table.filter(null, 'name', 'contains')); // trigger reset
    this.reloadFilterKVs(this.activities);
  }

  async preview(activity: any) {
    this.previewLink = this.sanitizer.bypassSecurityTrustResourceUrl(
      getPreviewLink('?load=' + encodeURIComponent(`${environment.apiUrl}/hub/${activity.id}?_t=${new Date().getTime()}`))
    );
    this.showPreview = true;
  }

  search(value: string) {
    if (this.searchTimeout)
      clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.http.get(`${environment.apiUrl}/hub?key=${value}`).subscribe(
        (activities: any) => {
          this.activities = activities.map((activity: any) => {
            // activity.id + activity.items.*.id/name/description + activity.iso + items.iso
            const actLang = activity.iso_language_code ? this.getLanguageName(activity.iso_language_code) : 'Unknown';
            activity.iso_language_code_name = actLang;
            activity.author_name = activity.author?.fullname || 'Unknown';
            
            activity._filter_idnamedescription = `${activity.id} ${activity.name} ${actLang} ${activity.author_name} ${activity.author?.email || ''} ` + activity.items.map((item: any) => {
              const itemLang = item.details.iso_language_code ? this.getLanguageName(item.details.iso_language_code) : 'Unknown';
              const tags = item.details.tags?.join(' ') || '';
              return `${item.item} ${item.details.name} ${item.details.description} ${itemLang} ${tags} `;
            }).join(' ');
            return activity;
          });
          this.reloadFilterKVs(this.activities);
        },
        (error: any) => console.log(error),
      );
    }, 300);
  }

  filter(table: any, $event: any) {
    this.globalQuery = $event.target.value;
    table.filterGlobal(this.globalQuery, 'contains');
    this.refreshAvailableFacetLabels(table.filteredValue || this.activities);
  }

  selectIntegrationLink(el: any) {
    setTimeout(() => el.querySelector('input.integration-link')?.select(), 0);
  }

  selectActivity2Clone(activity: any) {
    this.cloningActivity = JSON.parse(JSON.stringify(activity));
    delete this.cloningActivity._filter_idnamedescription;
    this.cloningActivity.items.forEach((i: any) => i.cloneItem = true);
  }

  submitClone() {
    this.cloning = true;
    this.http.post(`${environment.apiUrl}/hub/clone`, this.cloningActivity, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.cloningActivity = null;
        this.messages.add({ severity: 'success', summary: 'Success', detail: 'Activity cloned successfully!' });
      },
      error: (error: any) => console.error(error),
      complete: () => this.cloning = false,
    });
  }
}
