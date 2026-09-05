/**
 * The stylesheet and the client script, served from content-hashed URLs.
 *
 * The hash is derived from the asset itself, so a changed asset gets a new URL and can be
 * cached forever; nothing is ever served stale, and no build step is involved.
 */

import { createHash } from 'node:crypto';
import { APP_CSS } from './styles.js';
import { APP_JS } from './client.js';

const digest = (body: string): string => createHash('sha256').update(body).digest('hex').slice(0, 10);

export interface Asset {
  href: string;
  body: string;
  contentType: string;
}

export const CSS: Asset = {
  href: `/assets/app.${digest(APP_CSS)}.css`,
  body: APP_CSS,
  contentType: 'text/css; charset=utf-8',
};

export const JS: Asset = {
  href: `/assets/app.${digest(APP_JS)}.js`,
  body: APP_JS,
  contentType: 'text/javascript; charset=utf-8',
};

export function findAsset(pathname: string): Asset | undefined {
  if (pathname === CSS.href) return CSS;
  if (pathname === JS.href) return JS;
  return undefined;
}
