import { environment } from "../environments/environment";

export const getNavMenuBar = () => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'Sources', value: '/sources' },
    { label: 'Activities', value: '/activities' },
    { label: 'Users', value: '/user-admin' },
  ];
}

export const getPreviewLink = (link: string) => {
  let baseHref = 'http://localhost:3000';
  if (environment.production) {
    baseHref = document.querySelector('base')?.href || '';
    if (baseHref?.endsWith('/')) baseHref = baseHref.slice(0, -1);
  }
  return `${baseHref}/preview/index.html${link}`;
}