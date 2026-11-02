import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterEntries, toCsv } from '../catalogue.mjs';

const entries = JSON.parse(readFileSync(new URL('../data/cosplayers.json', import.meta.url))).cosplayers;

test('search supports case, Chinese names, booth numbers and multiple terms', () => {
  assert.equal(filterEntries(entries, { query: '  YINGTZE  ' })[0].booth, 'C-A05-06');
  assert.equal(filterEntries(entries, { query: '蚊子' })[0].name, '蚊子wenzi');
  assert.equal(filterEntries(entries, { query: 'c-f05 photobook' })[0].name, 'amelia khor 小飛鼠');
  assert.equal(filterEntries(entries, { query: 'Ｃ－Ｆ０５' }).length, 1);
  assert.equal(filterEntries(entries, { query: 'nonexistent-cosplayer' }).length, 0);
});

test('combined filters and shortlist export scope are exact', () => {
  const saved = new Set([entries[0].id, entries.at(-1).id]);
  assert.equal(filterEntries(entries, { saved, savedOnly: true }).length, 2);
  assert.deepEqual(filterEntries(entries, { saved, savedOnly: true, row: 'C-A', tag: 'photobook' }).map(e => e.id), [entries[0].id]);
  assert.equal(filterEntries(entries, { savedOnly: true }).length, 0);
  assert.equal(filterEntries(entries, { row: 'C-D' }).length, 0);
});

test('sorting does not mutate source or split shared booth entries', () => {
  const original = entries.map(e => e.id);
  const sorted = filterEntries(entries, { sort: 'name' });
  assert.equal(sorted.length, 66);
  assert.deepEqual(entries.map(e => e.id), original);
  assert.equal(sorted.filter(e => e.name === 'hayate 小爹 x kane 凯恩').length, 1);
  assert.equal(filterEntries(entries).at(-1).booth, 'C-F14');
});

test('CSV retains Chinese text and quotes commas, quotes, and line breaks', () => {
  assert.equal(readFileSync(new URL('../data/cosplayers.csv', import.meta.url), 'utf8'), toCsv(entries));
  const csv = toCsv([{ name: '鱼姬, "friend"\nsecond', booth: 'C-A01', row: 'C-A', tags: ['photobook', 'prints'] }]);
  assert.ok(csv.startsWith('\uFEFF"Name","Booth","Row","Merchandise","Event"\r\n'));
  assert.ok(csv.includes('"鱼姬, ""friend""\nsecond","C-A01","C-A","photobook; prints","Comic Fiesta 2024"'));
});

test('CSV neutralizes formulas and empty export retains the header', () => {
  for (const name of ['=1+1', '+cmd', '-2+1', '@SUM(A1)', '\t=HYPERLINK("x")']) {
    const csv = toCsv([{ name, booth: 'C-A01', row: 'C-A', tags: [] }]);
    assert.ok(csv.includes('"\'' + name.replaceAll('"', '""') + '"'));
  }
  assert.equal(toCsv([]).split('\r\n').length, 2);
});
