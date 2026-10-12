"""把多文件网页打成双击可开的离线单文件：样式、字体、数据与脚本全部内嵌。"""
from __future__ import annotations

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = "StageLab_胡桃夹子_单文件.html"


def as_data(path: Path, media: str) -> str:
    return f"data:{media};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "src/style.css").read_text(encoding="utf-8")
    for font in sorted((ROOT / "assets/fonts").glob("*.woff")):
        css = css.replace(f"../assets/fonts/{font.name}", as_data(font, "font/woff"))
    html = html.replace('<link rel="stylesheet" href="src/style.css">', f"<style>\n{css}\n</style>")
    for source in re.findall(r'<script src="([^"]+)"></script>', html):
        js = (ROOT / source).read_text(encoding="utf-8")
        if "</script" in js.lower():
            raise ValueError(f"原始脚本中有 HTML 结束标记: {source}")
        html = html.replace(f'<script src="{source}"></script>', f"<script>\n{js}\n</script>")
    output = ROOT / OUT
    output.write_text(html, encoding="utf-8")
    print(f"{output} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
