import { PageTutorial } from '../tutorial.types';

export const AdminTutorial: PageTutorial = {
  id: 'admin',
  title: 'Admin Guide',
  storageKey: 'pcex_tutorial_seen_admin',
  routePatterns: ['/admin'],
  steps: [
    {
      target: 'body',
      title: 'Admin Console Overview',
      content: 'The Admin Console provides centralized platform oversight to manage user accounts, assign author or administrator privileges, and monitor system activities.',
      position: 'center'
    },
    {
      target: '#admin-tabs',
      title: 'Management Sections',
      content: 'Use these tabs to switch between User Administration (search, role permissions) and Platform Bundles & Sources oversight.',
      position: 'bottom'
    }
  ]
};
