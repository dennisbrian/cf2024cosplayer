import hashlib
import html
import json
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from extract_cosplayers import extract


class ExtractionTests(unittest.TestCase):
    def test_all_original_names_and_booths_survive(self):
        raw = (ROOT / "sources/cf2024.html").read_bytes()
        source = raw.decode("utf-8")
        data = json.loads((ROOT / "data/cosplayers.json").read_text())
        records = data["cosplayers"]
        # Independent source controls, separate from the extractor's HTML parser.
        names = [html.unescape(value) for value in re.findall(r'class="booth-name"[^>]*>([^<]+)</h3>', source)]
        booths = re.findall(r'class="booth-number">([^<]+)</h3>', source)
        self.assertEqual(len(records), 66)
        self.assertEqual(data["count"], len(names))
        self.assertEqual([record["name"] for record in records], names)
        self.assertEqual([record["booth"] for record in records], [value.upper() for value in booths])
        self.assertEqual(records, extract(source))
        self.assertEqual(data["source"]["sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual({record["row"] for record in records}, {"C-A", "C-B", "C-C", "C-E", "C-F"})
        self.assertEqual(len({record["id"] for record in records}), 66)

    def test_entities_shared_names_and_nested_text(self):
        source = '<div class="group-tile" data-group-index="1"><h3 class="booth-number">c-a01-02</h3><h3 class="booth-name">鱼姬 &amp; <b>friend</b></h3><div class="circle-tag">prints</div><div class="circle-tag">prints</div></div>'
        record = extract(source)[0]
        self.assertEqual(record["name"], "鱼姬 & friend")
        self.assertEqual(record["booth"], "C-A01-02")
        self.assertEqual(record["tags"], ["prints"])

    def test_rejects_missing_duplicate_and_unclosed_booths(self):
        valid = '<div class="group-tile" data-group-index="1"><h3 class="booth-number">c-a01</h3><h3 class="booth-name">A</h3></div>'
        for source in ("", valid + valid, valid.replace('>A</h3>', '></h3>'), valid[:-6]):
            with self.subTest(source=source), self.assertRaises(ValueError):
                extract(source)


if __name__ == "__main__":
    unittest.main()
