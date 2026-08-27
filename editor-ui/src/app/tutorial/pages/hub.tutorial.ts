import { PageTutorial } from '../tutorial.types';

export const HubTutorial: PageTutorial = {
  id: 'hub',
  title: 'Hub Guide',
  storageKey: 'pcex_tutorial_seen_hub',
  routePatterns: ['/hub', '/'],
  steps: [
    {
      target: 'body',
      title: 'Hub Overview',
      content: 'The Hub is a public repository of worked-examples and challenge bundles shared by educators. You can explore, preview in the student viewer, embed into your LMS, or clone bundles into your account.',
      position: 'center'
    },
    {
      target: '#hub-toolbar',
      title: 'Search & Sort Toolbar',
      content: 'Quickly find bundles using keyword search, inspect active filter tags, and sort by creation date, title, or item count.',
      position: 'bottom'
    },
    {
      target: '#hub-sidebar',
      title: 'Filter Sidebar',
      content: 'Filter public bundles by Creators, Bundle Composition (Worked-Examples vs Challenges), Programming Language, Natural Language, and Tags.',
      position: 'right'
    },
    {
      target: '.hub-bundle-row',
      title: 'Bundle Cards & Breakdown',
      content: 'Each card displays bundle details, creator credits, and a numbered breakdown of all included problem items with their role and language.',
      position: 'bottom'
    },
    {
      target: '.hub-actions-bar',
      title: 'Bundle Actions',
      content: 'Preview the bundle in the interactive student viewer, copy direct embed snippets for your course page, or clone the bundle into your account.',
      position: 'left'
    }
  ]
};
