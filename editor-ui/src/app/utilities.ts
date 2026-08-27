import { environment } from '../environments/environment';
import { slugify } from 'transliteration';

export const getNavMenuBar = () => {
  return [
    { label: 'Hub', value: '/hub' },
    { label: 'Sources', value: '/sources' },
    { label: 'Bundles', value: '/bundles' },
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

export interface ParsedTag {
  raw: string;
  label: string;
  color?: string;
  styleClass: string;
  style?: { [key: string]: string };
}

export function parseTag(tag: string): ParsedTag {
  if (!tag) return { raw: '', label: '', styleClass: 'tag-color-gray' };
  const parts = tag.split(';');
  const label = parts[0].trim();
  let color = '';

  for (let i = 1; i < parts.length; i++) {
    const sub = parts[i].trim();
    if (sub.toLowerCase().startsWith('color=')) {
      color = sub.substring(6).trim().toLowerCase();
    }
  }

  // Eye-friendly semantic color palette
  const colorMap: { [key: string]: string } = {
    orange: 'tag-color-orange',
    amber: 'tag-color-orange',
    purple: 'tag-color-purple',
    violet: 'tag-color-purple',
    indigo: 'tag-color-purple',
    blue: 'tag-color-blue',
    sky: 'tag-color-blue',
    cyan: 'tag-color-blue',
    green: 'tag-color-green',
    emerald: 'tag-color-green',
    red: 'tag-color-red',
    rose: 'tag-color-red',
    yellow: 'tag-color-yellow',
    pink: 'tag-color-pink',
    gray: 'tag-color-gray',
    slate: 'tag-color-gray'
  };

  if (color && colorMap[color]) {
    return { raw: tag, label, color, styleClass: colorMap[color] };
  } else if (color && color.startsWith('#')) {
    return {
      raw: tag,
      label,
      color,
      styleClass: 'tag-color-custom',
      style: {
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}40`,
        borderWidth: '1px',
        borderStyle: 'solid'
      }
    };
  }

  return { raw: tag, label, styleClass: 'tag-color-gray' };
}

export function getTagLabel(tag: string): string {
  return parseTag(tag).label;
}

export function getTagClass(tag: string): string {
  return parseTag(tag).styleClass;
}

export function getTagStyle(tag: string): { [key: string]: string } | undefined {
  return parseTag(tag).style;
}
