# CF2024 cosplayer directory

A static directory extracted from the existing Comic Fiesta 2024 booth catalogue. No backend, API keys, build step, or npm dependencies are needed.

## Preview

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. Use a web server rather than opening `index.html` directly because the app loads a JSON file. The same files work on GitHub Pages; the existing CNAME is preserved.

## Use the list

- Search names, booth numbers, and merchandise; filter by booth row or merchandise and sort by name or booth.
- Save booths to a shortlist stored in this browser. Check **My shortlist** to view and export saved entries. Other filters still apply.
- **CSV**, **JSON**, and **Copy names** export exactly the currently displayed entries. Reset filters to export the full list. CSV includes a UTF-8 BOM for Chinese names in Excel and escapes spreadsheet formulas.
- The full extracted list is in [`data/cosplayers.json`](data/cosplayers.json). Each entry includes its stable source ID, original name, booth, row, and merchandise tags. JSON exports retain source metadata.
- Download the complete CSV from [`data/cosplayers.csv`](data/cosplayers.csv), including Chinese names and shared booth listings.
- The original floor plan remains available below the directory and can be opened full size.

## Source and scope

`sources/cf2024.html` preserves the original `index.html` from commit `768d4da`. The extractor parses its HTML without executing the obfuscated JavaScript. The new page allows normal copying, selection, and browser shortcuts.

There are **66 booth entries across five rows: C-A, C-B, C-C, C-E, and C-F**. These are booth listings, not 66 independently verified individuals. Shared booth names stay intact; original spelling, case, and Chinese text are preserved. Missing booth numbers and C-D are not filled in. The source provides no social URLs, individual identities, or current event attendance.

Regenerate the data from the archived source:

```sh
python3 scripts/extract_cosplayers.py
node scripts/export_csv.mjs
```

The JSON records the source repository, revision, archive path, and SHA-256. The optional `--source` and `--output` flags support another copy of this same archive format; update the provenance in the script before using it for another event or revision.

## Checks

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/catalogue.test.mjs
```

The page uses local application assets and optional Google Fonts with system fallbacks. Shortlists never leave browser storage. Publishing changes requires committing and pushing separately.
