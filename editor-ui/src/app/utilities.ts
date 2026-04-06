import { environment } from '../environments/environment';
import { slugify } from 'transliteration';

export const getNavMenuBar = () => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'Sources', value: '/sources' },
    { label: 'Bundles', value: '/activities' },
    { label: 'Admin', value: '/admin' },
  ];
};

export const getPreviewLink = (qpLoad: string) => {
  const host = environment.production ? 'https://acos.cs.vt.edu' : 'http://localhost:2000';
  return `${host}/html/acos-pcex/acos-pcex-examples/preview${qpLoad}`;
};

export const getPublishedLink = (activity: { id: string; name: string }, protocol: string = 'html') => {
  const host = environment.production ? 'https://acos.cs.vt.edu' : 'http://localhost:2000';
  const name = slugify(activity.name, { separator: '_' });
  return `${host}/${protocol}/acos-pcex/acos-pcex-examples/${name.replace(/ /g, '_').replace(/\./g, '_')}__${activity.id}`;
};
