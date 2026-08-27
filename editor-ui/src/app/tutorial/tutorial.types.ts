export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TutorialStep {
  /** CSS selector for the DOM element to highlight */
  target: string;
  /** Header title for this step */
  title: string;
  /** Educational explanation content */
  content: string;
  /** Preferred tooltip position relative to target */
  position?: TooltipPosition;
  /** Optional custom action before step activates */
  beforeShow?: () => void;
}

export interface PageTutorial {
  /** Unique ID for the tutorial */
  id: string;
  /** Human readable title of the tour */
  title: string;
  /** LocalStorage key for tracking first-time completion */
  storageKey: string;
  /** Route path patterns matching this tutorial (e.g. ['/hub'], ['/sources']) */
  routePatterns: string[];
  /** Steps in sequence */
  steps: TutorialStep[];
}

