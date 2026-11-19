// Merges every source (generated or mirrored) into the one `store.json` people add to Store.
// Pure function: no network, no file access.

import { rawUrl } from './manifest.mjs';

export const STORE_FILE = 'store.json';

/** The reverse-DNS id of the combined store, e.g. io.github.zkevinly.aiostore. */
export function storeIdentifier(manifest) {
  const [owner, name] = manifest.repository.toLowerCase().split('/');
  return `io.github.${owner}.${name}`;
}

/** The URL to paste into Store -> Sources. */
export const storeUrl = (manifest) => rawUrl(manifest, STORE_FILE);

/**
 * `snapshots` is `[{ source, json }]` in sources.json order. Apps are concatenated; when two
 * sources ship the same bundle identifier the first one wins and the clash is reported,
 * because Store can't tell two apps with one bundle ID apart. Versions are passed through as
 * they are; Store tidies up old ones itself.
 */
export function buildStore(manifest, snapshots) {
  const apps = [];
  const news = [];
  const owners = new Map(); // bundleIdentifier -> source id
  const seenNews = new Set();
  const conflicts = [];

  for (const { source, json } of snapshots) {
    for (const app of json.apps ?? []) {
      const owner = owners.get(app.bundleIdentifier);
      if (owner) {
        conflicts.push(`${app.bundleIdentifier} is in both "${owner}" and "${source.id}"; kept "${owner}"`);
        continue;
      }
      owners.set(app.bundleIdentifier, source.id);
      apps.push(app);
    }
    for (const item of json.news ?? []) {
      const key = item.identifier ?? JSON.stringify(item);
      if (seenNews.has(key)) continue;
      seenNews.add(key);
      news.push(item);
    }
  }

  const store = {
    name: manifest.name,
    identifier: storeIdentifier(manifest),
    ...(manifest.subtitle ? { subtitle: manifest.subtitle } : {}),
    ...(manifest.iconURL ? { iconURL: manifest.iconURL } : {}),
    ...(manifest.tintColor ? { tintColor: manifest.tintColor } : {}),
    website: `https://github.com/${manifest.repository}`,
    sourceURL: storeUrl(manifest),
    apps,
    news,
  };
  return { store, conflicts };
}
