import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildStore, storeIdentifier } from '../scripts/lib/aggregate.mjs';

const manifest = { name: 'AIOStore', repository: 'zKevinLy/aiostore', branch: 'main' };
const snap = (id, apps, news) => ({ source: { id }, json: { apps, news } });
const app = (bundleIdentifier, name = bundleIdentifier) => ({ name, bundleIdentifier, versions: [] });

describe('buildStore', () => {
  it('concatenates apps in order and names the store from sources.json', () => {
    const { store, conflicts } = buildStore(manifest, [
      snap('a', [app('com.a')]),
      snap('b', [app('com.b1'), app('com.b2')]),
    ]);
    assert.deepEqual(store.apps.map((x) => x.bundleIdentifier), ['com.a', 'com.b1', 'com.b2']);
    assert.equal(store.name, 'AIOStore');
    assert.equal(store.identifier, storeIdentifier(manifest));
    assert.deepEqual(conflicts, []);
  });

  it('keeps the first app when two sources share a bundle identifier', () => {
    const { store, conflicts } = buildStore(manifest, [
      snap('a', [app('com.same', 'first')]),
      snap('b', [app('com.same', 'second')]),
    ]);
    assert.deepEqual(store.apps.map((x) => x.name), ['first']);
    assert.match(conflicts[0], /com\.same.*"a".*"b"/);
  });

  it('merges news without repeating an item', () => {
    const item = { identifier: 'n1', title: 'Hi' };
    const { store } = buildStore(manifest, [snap('a', [app('com.a')], [item]), snap('b', [app('com.b')], [item])]);
    assert.equal(store.news.length, 1);
  });

  it('copes with no snapshots at all', () => {
    assert.deepEqual(buildStore(manifest, []).store.apps, []);
  });
});

describe('buildStore versions', () => {
  it('passes every version through untouched', () => {
    const versions = ['1', '2', '3', '4', '5'].map((n) => ({ version: n, date: `2026-0${n}-01` }));
    const { store } = buildStore(manifest, [snap('a', [{ ...app('com.a'), versions }])]);
    assert.deepEqual(store.apps[0].versions, versions);
  });
});
