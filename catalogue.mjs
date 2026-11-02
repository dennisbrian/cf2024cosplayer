export function normalize(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase().trim();
}

export function filterEntries(entries, { query = '', row = '', tag = '', savedOnly = false, saved = new Set(), sort = 'booth' } = {}) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    const text = normalize([entry.name, entry.booth, ...entry.tags].join(' '));
    return terms.every(term => text.includes(term)) && (!row || entry.row === row)
      && (!tag || entry.tags.includes(tag)) && (!savedOnly || saved.has(entry.id));
  }).sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : a.booth.localeCompare(b.booth, undefined, { numeric: true })) || a.id.localeCompare(b.id));
}

// Quote every field and neutralize spreadsheet formulas in externally sourced text.
export function toCsv(entries) {
  const cell = value => {
    const text = String(value);
    const safe = /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [['Name', 'Booth', 'Row', 'Merchandise', 'Event'],
    ...entries.map(entry => [entry.name, entry.booth, entry.row, entry.tags.join('; '), 'Comic Fiesta 2024'])]
    .map(record => record.map(cell).join(',')).join('\r\n') + '\r\n';
}
