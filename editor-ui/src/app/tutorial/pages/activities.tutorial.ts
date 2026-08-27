import { PageTutorial } from '../tutorial.types';

export const ActivitiesTutorial: PageTutorial = {
  id: 'bundles',
  title: 'Bundles Guide',
  storageKey: 'pcex_tutorial_seen_bundles',
  routePatterns: ['/bundles', '/activities'],
  steps: [
    {
      target: 'body',
      title: 'Bundles Overview',
      content: 'A Bundle packages multiple programming exercises into a structured learning sequence. It combines Worked-Examples (step-by-step explained code) and Challenges (code-completion exercises) for students.',
      position: 'center'
    },
    {
      target: '#bundles-toolbar',
      title: 'Search & Sort Toolbar',
      content: 'Click "+ New Bundle" to assemble a new sequence of sources, review matching counts, or sort by creation date, title, or item count.',
      position: 'bottom'
    },
    {
      target: '#bundles-sidebar',
      title: 'Filter Sidebar',
      content: 'Filter bundles by Ownership (Mine vs Shared), Creators, Composition type, Programming Language, Natural Language, and item count.',
      position: 'right'
    },
    {
      target: '.bundle-row',
      title: 'Bundle Cards & Breakdown',
      content: 'Each card displays bundle details, linked translation variants, and an ordered #1, #2, #3 breakdown of each problem item with its role and language.',
      position: 'bottom'
    },
    {
      target: '.bundle-row-actions',
      title: 'Bundle Actions',
      content: 'Edit bundle composition, test in the student viewer, copy direct embed links, publish to the public Hub, or sync with PAWS.',
      position: 'left'
    }
  ]
};
