export const baseHref = document.querySelector('base')?.href;
export const environment = {
  production: true,
  apiUrl: baseHref + 'api',
};
export const uiBaseHref = baseHref;