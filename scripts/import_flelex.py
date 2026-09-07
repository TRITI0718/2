"""把官方 FLELex/Beacco TSV 转换为网站使用的 A1-B2 JSON 数据。"""

from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "FleLex_TT_Beacco.tsv"
OUTPUT = ROOT / "data" / "cefr_words.json"
LEVELS = ("A1", "A2", "B1", "B2")
POS_LABELS = {
    "NOM": "名词",
    "VER": "动词",
    "ADJ": "形容词",
    "ADV": "副词",
    "PRO": "代词",
    "PRP": "介词",
    "PRP:det": "介词限定词",
    "INT": "感叹词",
    "KON": "连词",
    "DET:POS": "物主限定词",
    "DET:ART": "冠词",
}


def number(value: str) -> float:
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return 0.0


def main() -> None:
    entries: list[dict] = []
    with SOURCE.open("r", encoding="utf-8", newline="") as source:
        for index, row in enumerate(csv.DictReader(source, delimiter="\t"), start=1):
            level = row.get("level", "").upper()
            word = row.get("word", "").strip()
            if level not in LEVELS or not word:
                continue
            tag = row.get("tag", "").strip() or "OTHER"
            entries.append({
                "id": f"flelex-{index}",
                "word": word,
                "level": level,
                "tag": tag,
                "part_of_speech": POS_LABELS.get(tag, tag),
                "level_frequency": number(row.get(f"freq_{level}", "0")),
                "total_frequency": number(row.get("freq_total", "0")),
                "frequencies": {
                    item_level: number(row.get(f"freq_{item_level}", "0"))
                    for item_level in LEVELS
                },
            })

    level_order = {level: index for index, level in enumerate(LEVELS)}
    entries.sort(key=lambda item: (
        level_order[item["level"]],
        -item["level_frequency"],
        item["word"].casefold(),
    ))
    OUTPUT.write_text(
        json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    counts = {level: sum(1 for item in entries if item["level"] == level) for level in LEVELS}
    print(f"已生成 {OUTPUT}：{len(entries)} 个词元，{counts}")


if __name__ == "__main__":
    main()
