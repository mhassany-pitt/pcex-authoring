import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getNavMenuBar } from '../utilities';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.less']
})
export class AdminComponent {
  activeTabIndex = 0;
  private readonly maxTabIndex = 1;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = Number(params.get('tab'));
      this.activeTabIndex = Number.isInteger(tab) && tab >= 0 && tab <= this.maxTabIndex ? tab : 0;
    });
  }

  onTabChange(index: number) {
    this.activeTabIndex = index;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index },
      queryParamsHandling: 'merge',
    });
  }
}
