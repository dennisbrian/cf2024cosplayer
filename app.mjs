import { filterEntries, toCsv } from './catalogue.mjs';

const $ = id => document.getElementById(id);
const storageKey = 'cf2024-shortlist-v1';
let entries = [];
let visible = [];
let saved = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(stored)) saved = new Set(stored.filter(id => typeof id === 'string'));
} catch { /* The directory also works when browser storage is unavailable. */ }

function announce(text) { $('action-status').textContent = text; }
function options(select, values) {
  for (const value of values) select.add(new Option(value, value));
}
function download(content, type, extension) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `cf2024-${$('saved-only').checked ? 'shortlist' : 'cosplayers'}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Exported ${visible.length} booth entries.`);
}

function render() {
  visible = filterEntries(entries, {
    query: $('search').value, row: $('row').value, tag: $('tag').value,
    sort: $('sort').value, savedOnly: $('saved-only').checked, saved,
  });
  $('result-count').textContent = `${visible.length} of ${entries.length} booth entries`;
  $('saved-count').textContent = saved.size;
  $('empty').hidden = visible.length > 0;
  for (const id of ['export-csv', 'export-json', 'copy-list', 'random']) $(id).disabled = !visible.length;
  const fragment = document.createDocumentFragment();
  for (const entry of visible) {
    const card = $('entry-template').content.cloneNode(true);
    card.querySelector('.booth').textContent = entry.booth;
    card.querySelector('h3').textContent = entry.name;
    const button = card.querySelector('.save');
    button.dataset.id = entry.id;
    button.setAttribute('aria-pressed', String(saved.has(entry.id)));
    button.setAttribute('aria-label', `${saved.has(entry.id) ? 'Remove' : 'Save'} ${entry.name}${saved.has(entry.id) ? ' from' : ' to'} shortlist`);
    button.textContent = saved.has(entry.id) ? '★ Saved' : '☆ Save';
    const tags = card.querySelector('.tags');
    for (const tag of entry.tags) {
      const label = document.createElement('span');
      label.textContent = tag;
      tags.append(label);
    }
    if (!entry.tags.length) tags.textContent = 'No merchandise listed';
    fragment.append(card);
  }
  $('entries').replaceChildren(fragment);
}

for (const id of ['search', 'row', 'tag', 'sort', 'saved-only']) $(id).addEventListener('input', render);
$('entries').addEventListener('click', event => {
  const button = event.target.closest('.save');
  if (!button) return;
  const id = button.dataset.id;
  const name = entries.find(entry => entry.id === id).name;
  if (saved.has(id)) saved.delete(id); else saved.add(id);
  let persisted = true;
  try { localStorage.setItem(storageKey, JSON.stringify([...saved])); } catch { persisted = false; }
  render();
  const remainingButton = $('entries').querySelector(`[data-id="${id}"]`);
  (remainingButton || $('saved-only')).focus();
  announce(`${name} ${saved.has(id) ? 'saved to' : 'removed from'} shortlist.${persisted ? '' : ' Browser storage is unavailable; changes last for this session.'}`);
});
$('reset-filters').addEventListener('click', () => {
  $('filters').reset();
  render();
  $('search').focus();
});
$('filters').addEventListener('submit', event => event.preventDefault());
$('export-csv').addEventListener('click', () => download(toCsv(visible), 'text/csv;charset=utf-8', 'csv'));
$('export-json').addEventListener('click', () => download(JSON.stringify({ event: 'Comic Fiesta 2024', count: visible.length, source: datasetSource, cosplayers: visible }, null, 2) + '\n', 'application/json', 'json'));
$('copy-list').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(visible.map(entry => `${entry.booth}\t${entry.name}`).join('\n'));
    announce(`Copied ${visible.length} booth entries.`);
  } catch { announce('Copy is unavailable in this browser. Download CSV or JSON instead.'); }
});
$('random').addEventListener('click', () => {
  if (!visible.length) return;
  const entry = visible[Math.floor(Math.random() * visible.length)];
  const button = $('entries').querySelector(`[data-id="${entry.id}"]`);
  button.closest('article').scrollIntoView({ behavior: 'smooth', block: 'center' });
  button.focus({ preventScroll: true });
  announce(`Try ${entry.name} at ${entry.booth}.`);
});

let datasetSource;
try {
  const response = await fetch('./data/cosplayers.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const dataset = await response.json();
  entries = dataset.cosplayers;
  datasetSource = dataset.source;
  const validIds = new Set(entries.map(entry => entry.id));
  saved = new Set([...saved].filter(id => validIds.has(id)));
  options($('row'), [...new Set(entries.map(entry => entry.row))].sort());
  options($('tag'), [...new Set(entries.flatMap(entry => entry.tags))].sort());
  $('total-count').textContent = entries.length;
  $('row-count').textContent = new Set(entries.map(entry => entry.row)).size;
  $('filter-controls').disabled = false;
  $('loading').hidden = true;
  render();
} catch {
  $('result-count').textContent = 'Directory unavailable';
  $('loading').textContent = 'The directory could not load. Refresh this page to try again, or use the full dataset download above.';
}
