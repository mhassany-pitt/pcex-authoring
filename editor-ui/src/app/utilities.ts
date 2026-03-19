import { environment } from '../environments/environment';

export const getNavMenuBar = () => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'Sources', value: '/sources' },
    { label: 'Activities', value: '/activities' },
    { label: 'Users', value: '/user-admin' },
  ];
};

export const getPreviewLink = (qpLoad: string) => {
  const host = environment.production ? 'https://acos.cs.vt.edu' : 'http://localhost:2000';
  return `${host}/html/acos-pcex/acos-pcex-examples/preview${qpLoad}`;
};
