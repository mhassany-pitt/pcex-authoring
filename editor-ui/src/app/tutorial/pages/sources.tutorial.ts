import { PageTutorial } from '../tutorial.types';

export const SourcesTutorial: PageTutorial = {
  id: 'sources',
  title: 'Sources Guide',
  storageKey: 'pcex_tutorial_seen_sources',
  routePatterns: ['/sources'],
  steps: [
    {
      target: 'body',
      title: 'Sources Overview',
      content: 'A Source is an individual programming problem containing code, line explanations, and optional blank lines. Sources serve as the modular building blocks that you assemble into Bundles.',
      position: 'center'
    },
    {
      target: '#sources-toolbar',
      title: 'Search & Sort Toolbar',
      content: 'Click "+ New Source" to author a new source in the Code Editor, review matching counts, or sort by creation date, title, or blanks count.',
      position: 'bottom'
    },
    {
      target: '#sources-sidebar',
      title: 'Filter Sidebar',
      content: 'Filter sources by Ownership (Mine, Shared, All), Creators, Challenge eligibility (blank lines), Programming Language, and Natural Language.',
      position: 'right'
    },
    {
      target: '.sources-row',
      title: 'Source Cards & Blanks Eligibility',
      content: 'The blank lines badge indicates eligibility: Sources with 0 blank lines can only be used as Worked-Examples. Sources with 1 or more blank lines can serve as Challenges or Worked-Examples.',
      position: 'bottom'
    },
    {
      target: '.sources-row-actions',
      title: 'Source Actions',
      content: 'Click the pencil icon or title to open the Code Editor, test live execution in Preview, clone a copy, or archive old sources.',
      position: 'left'
    }
  ]
};
