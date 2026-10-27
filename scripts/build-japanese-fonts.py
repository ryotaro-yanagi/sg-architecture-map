"""Build licensed Source Han Japanese subsets before SGM's Pages build.

The Adobe upstream font binaries are not committed to this repository.
"""
from __future__ import annotations

import hashlib
import io
from pathlib import Path
from urllib.request import urlopen

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "fonts"
UPSTREAM = [
    ("sans", "SourceHanSansJP-VF.otf.woff2", "b2ab23e6c15840b9c4735ea7cda36ae51b204427", "SGM Han Sans JP"),
    ("serif", "SourceHanSerifJP-VF.otf.woff2", "811ca353fa81fcf755e40bfbed40d71cc2d21447", "SGM Han Serif JP"),
]


def fetch(url: str) -> bytes:
    with urlopen(url, timeout=120) as response:
        return response.read()


def required_japanese_characters() -> set[int]:
    # Gather characters from source and localized data, plus kana and punctuation.
    texts = []
    for directory in (ROOT / "src", ROOT / "en", ROOT / "ja"):
        for path in directory.rglob("*"):
            if path.suffix in {".ts", ".tsx", ".json", ".html"}:
                texts.append(path.read_text(encoding="utf-8"))
    codepoints = {ord(c) for text in texts for c in text}
    codepoints.update(range(0x3000, 0x3100))
    codepoints.update(range(0xFF61, 0xFFA0))
    # Non-Japanese characters remain with Source Sans 3 / Source Serif 4.
    return {cp for cp in codepoints if 0x3000 <= cp <= 0xFFFF}


def rename(font: TTFont, family: str) -> None:
    # Modified font subsets cannot use Adobe's reserved name "Source".
    names = font["name"]
    postscript = family.replace(" ", "-")
    for record in list(names.names):
        if record.nameID in {1, 3, 4, 6, 16}:
            value = postscript if record.nameID == 6 else family
            names.setName(value, record.nameID, record.platformID, record.platEncID, record.langID)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    needed = required_japanese_characters()
    print(f"Japanese codepoints collected: {len(needed)}")
    for kind, filename, expected_sha, family in UPSTREAM:
        base = f"https://raw.githubusercontent.com/adobe-fonts/source-han-{kind}/release"
        original = fetch(f"{base}/Variable/WOFF2/OTF/Subset/{filename}")
        blob_sha = hashlib.sha1(b"blob " + str(len(original)).encode() + b"\0" + original).hexdigest()
        if blob_sha != expected_sha:
            raise ValueError(f"Official font integrity mismatch: {filename}")

        font = TTFont(io.BytesIO(original))
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=needed)
        sub.subset(font)
        rename(font, family)
        target = OUT / f"sgm-han-{kind}-jp.woff2"
        font.flavor = "woff2"
        font.save(target)
        print(f"{target.name}: {len(original) // 1024} KiB -> {target.stat().st_size // 1024} KiB")

        (OUT / f"LICENSE-source-han-{kind}.txt").write_bytes(fetch(f"{base}/LICENSE.txt"))


if __name__ == "__main__":
    main()
