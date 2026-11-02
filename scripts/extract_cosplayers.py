#!/usr/bin/env python3
"""Extract the archived CF2024 booth catalogue without executing its scripts."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


class CatalogueParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.records = []
        self.depth = 0
        self.record = None
        self.field = None
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "div":
            self.depth += 1
        if "group-tile" in classes:
            if self.record is not None:
                raise ValueError("Nested booth entry")
            self.record = {"id": "cf2024-" + attrs["data-group-index"], "tags": []}
            self.record_depth = self.depth
        if self.record is not None:
            for field in ("booth-number", "booth-name", "circle-tag"):
                if field in classes:
                    self.field = (field, tag)
                    self.parts = []

    def handle_data(self, data):
        if self.field:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if self.field and self.field[1] == tag:
            field = self.field[0]
            value = " ".join("".join(self.parts).split())
            if field == "circle-tag":
                if value and value not in self.record["tags"]:
                    self.record["tags"].append(value)
            else:
                self.record["booth" if field == "booth-number" else "name"] = value
            self.field = None
        if tag == "div":
            if self.record is not None and self.depth == self.record_depth:
                self.records.append(self.record)
                self.record = None
            self.depth -= 1


def extract(source):
    parser = CatalogueParser()
    parser.feed(source)
    if parser.record is not None or not parser.records:
        raise ValueError("Incomplete or empty booth catalogue")
    ids, booths = set(), set()
    for record in parser.records:
        booth = record.get("booth", "").upper()
        if not record.get("name") or not re.fullmatch(r"C-[A-Z]\d{2}(?:-\d{2})?", booth):
            raise ValueError(f"Missing name or invalid booth: {record}")
        if record["id"] in ids or booth in booths:
            raise ValueError(f"Duplicate booth: {record}")
        ids.add(record["id"])
        booths.add(booth)
        record["booth"] = booth
        record["row"] = booth[:3]
    return parser.records


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--source", type=Path, default=ROOT / "sources/cf2024.html")
    cli.add_argument("--output", type=Path, default=ROOT / "data/cosplayers.json")
    args = cli.parse_args()
    raw = args.source.read_bytes()
    records = extract(raw.decode("utf-8"))
    dataset = {
        "event": "Comic Fiesta 2024",
        "source": {
            "repository": "https://github.com/dennisbrian/cf2024cosplayer",
            "revision": "768d4da",
            "file": "sources/cf2024.html",
            "sha256": hashlib.sha256(raw).hexdigest(),
            "note": "Archived booth listings; shared booths are kept intact. Not a current attendance list or verified social directory.",
        },
        "count": len(records),
        "cosplayers": records,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(records)} booth entries to {args.output}")


if __name__ == "__main__":
    main()
