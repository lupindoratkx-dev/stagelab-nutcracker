"""改了中文文案后，重新制作本页用到的字形子集（WOFF）。需要 fontTools。

默认使用 Noto Sans CJK SC（Regular、Medium）与 Noto Serif CJK SC（Medium），均为 SIL OFL 1.1 字体。
可用 --sans-regular / --sans-medium / --serif 指定其他路径；.ttc 字体用 --index 指定简体中文的序号。
"""
from __future__ import annotations

import argparse
from pathlib import Path
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, TTCollection

ROOT = Path(__file__).resolve().parents[1]
NOTO = Path("/usr/share/fonts/opentype/noto")


def load(path: Path, family: str) -> TTFont:
    if path.suffix.lower() == ".ttc":
        for font in TTCollection(path).fonts:
            if font["name"].getDebugName(1).startswith(family):
                return font
        raise SystemExit(f"{path} 中找不到 {family}")
    return TTFont(path)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--sans-regular", type=Path, default=NOTO / "NotoSansCJK-Regular.ttc")
    p.add_argument("--sans-medium", type=Path, default=NOTO / "NotoSansCJK-Medium.ttc")
    p.add_argument("--serif", type=Path, default=NOTO / "NotoSerifCJK-Medium.ttc")
    a = p.parse_args()
    paths = [ROOT / "index.html", ROOT / "productions/data.js", *sorted((ROOT / "src").glob("*.js"))]
    chars = set("".join(x.read_text(encoding="utf-8") for x in paths))
    chars |= set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,:;!?'\"()[]/-–—…·×′″≈↗→←↑↓")
    jobs = [("sans-regular", a.sans_regular, "Noto Sans CJK SC"), ("sans-medium", a.sans_medium, "Noto Sans CJK SC"), ("serif-medium", a.serif, "Noto Serif CJK SC")]
    for name, path, family in jobs:
        font = load(path, family)
        opt = Options(); opt.flavor = "woff"; opt.layout_features = ["*"]; opt.name_IDs = ["*"]; opt.notdef_outline = True
        sub = Subsetter(options=opt)
        sub.populate(unicodes=[ord(c) for c in chars])
        sub.subset(font)
        font.flavor = "woff"
        out = ROOT / "assets/fonts" / f"{name}.woff"
        font.save(out)
        print(f"{name}: {out.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
