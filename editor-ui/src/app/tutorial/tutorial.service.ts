import { Injectable, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PageTutorial, TutorialStep } from './tutorial.types';
import { HubTutorial } from './pages/hub.tutorial';
import { SourcesTutorial } from './pages/sources.tutorial';
import { ActivitiesTutorial } from './pages/activities.tutorial';
import { EditorTutorial } from './pages/editor.tutorial';
import { AdminTutorial } from './pages/admin.tutorial';

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  public allTutorials: PageTutorial[] = [
    HubTutorial,
    SourcesTutorial,
    ActivitiesTutorial,
    EditorTutorial,
    AdminTutorial
  ];

  public isActive: boolean = false;
  public currentTutorial: PageTutorial | null = null;
  public currentStepIndex: number = 0;
  public spotlightRect: SpotlightRect | null = null;
  public hasTargetElement: boolean = false;

  private routeCheckTimeout: any = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private router: Router, private ngZone: NgZone) {
    this.initRouteListener();
  }

  private initRouteListener() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (this.isActive) {
          this.skip(false);
        }
        this.scheduleAutoTourCheck(event.urlAfterRedirects || event.url);
      });

    // Check on initial load
    setTimeout(() => {
      this.scheduleAutoTourCheck(this.router.url);
    }, 500);
  }

  private scheduleAutoTourCheck(url: string) {
    if (this.routeCheckTimeout) {
      clearTimeout(this.routeCheckTimeout);
    }

    const tutorial = this.getTutorialForUrl(url);
    if (!tutorial) return;

    const seen = localStorage.getItem(tutorial.storageKey) === 'true';
    if (!seen) {
      this.routeCheckTimeout = setTimeout(() => {
        // Double-check user hasn't started or navigated away
        if (!this.isActive && this.getTutorialForUrl(this.router.url)?.id === tutorial.id) {
          this.startTour(tutorial, false);
        }
      }, 1000);
    }
  }

  public getTutorialForUrl(url: string): PageTutorial | null {
    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    return (
      this.allTutorials.find(t =>
        t.routePatterns.some(pattern => {
          if (pattern === '/') return cleanUrl === '/' || cleanUrl === '';
          return cleanUrl.startsWith(pattern);
        })
      ) || null
    );
  }

  public get currentStep(): TutorialStep | null {
    if (!this.currentTutorial || !this.isActive) return null;
    return this.currentTutorial.steps[this.currentStepIndex] || null;
  }

  public get totalSteps(): number {
    return this.currentTutorial?.steps.length || 0;
  }

  public startTourForCurrentPage(force: boolean = true) {
    const tutorial = this.getTutorialForUrl(this.router.url);
    if (tutorial) {
      this.startTour(tutorial, force);
    } else {
      // Fallback: start hub tutorial if on generic page
      this.startTour(HubTutorial, force);
    }
  }

  public startTour(tutorial: PageTutorial, force: boolean = false) {
    if (!tutorial || !tutorial.steps.length) return;

    this.currentTutorial = tutorial;
    this.currentStepIndex = 0;
    this.isActive = true;

    this.goToStep(0);
  }

  public next() {
    if (!this.currentTutorial) return;
    if (this.currentStepIndex < this.currentTutorial.steps.length - 1) {
      this.goToStep(this.currentStepIndex + 1);
    } else {
      this.done();
    }
  }

  public prev() {
    if (this.currentStepIndex > 0) {
      this.goToStep(this.currentStepIndex - 1);
    }
  }

  public skip(persist: boolean = true) {
    if (persist && this.currentTutorial) {
      this.markSeen(this.currentTutorial);
    }
    this.cleanupTour();
  }

  public done() {
    if (this.currentTutorial) {
      this.markSeen(this.currentTutorial);
    }
    this.cleanupTour();
  }

  private markSeen(tutorial: PageTutorial) {
    try {
      localStorage.setItem(tutorial.storageKey, 'true');
    } catch (e) {
      console.warn('Could not save tutorial completion to localStorage', e);
    }
  }

  private cleanupTour() {
    this.isActive = false;
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.spotlightRect = null;
    this.hasTargetElement = false;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  public goToStep(index: number) {
    if (!this.currentTutorial || index < 0 || index >= this.currentTutorial.steps.length) return;

    this.currentStepIndex = index;
    const step = this.currentTutorial.steps[index];

    if (step.beforeShow) {
      try {
        step.beforeShow();
      } catch (e) {
        console.error('Error executing beforeShow on tutorial step', e);
      }
    }

    this.updateSpotlight(step);
  }

  public updateSpotlight(step: TutorialStep) {
    if (step.position === 'center' || step.target === 'body' || !step.target) {
      this.hasTargetElement = false;
      this.spotlightRect = null;
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      // First pass immediate check
      setTimeout(() => {
        const el = document.querySelector(step.target) as HTMLElement;
        this.ngZone.run(() => {
          if (el) {
            this.hasTargetElement = true;
            this.recalculateRect(el);

            try {
              el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            } catch (e) {
              el.scrollIntoView();
            }

            // Track during scroll animation to prevent any coordinate lag
            let frames = 0;
            const trackInterval = setInterval(() => {
              frames++;
              this.recalculateRect(el);
              if (frames > 15) {
                clearInterval(trackInterval);
              }
            }, 30);
          } else {
            this.hasTargetElement = false;
            this.spotlightRect = null;
          }
        });
      }, 50);
    });
  }

  public recalculateRect(el?: HTMLElement) {
    const target = el || (this.currentStep ? (document.querySelector(this.currentStep.target) as HTMLElement) : null);
    if (target) {
      const rect = target.getBoundingClientRect();
      const padding = 8;
      this.spotlightRect = {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      };
      this.hasTargetElement = true;
    } else {
      this.hasTargetElement = false;
      this.spotlightRect = null;
    }
  }
}

