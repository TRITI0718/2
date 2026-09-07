from __future__ import annotations

import json
import random
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="French Learning Web",
    version="0.5.0",
    description="API-first French study website designed for future iOS/macOS clients.",
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def load_json(filename: str):
    path = DATA_DIR / filename
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def load_cefr_words() -> tuple[dict, ...]:
    return tuple(load_json("cefr_words.json"))


@lru_cache(maxsize=1)
def load_cefr_translations() -> dict[str, dict]:
    path = DATA_DIR / "cefr_translations.json"
    if not path.exists():
        return {}
    data = load_json("cefr_translations.json")
    if not isinstance(data, dict):
        raise ValueError("cefr_translations.json 必须是以 FLELex id 为 key 的 JSON object。")
    return data


def normalize_search(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in value if not unicodedata.combining(char))


def get_cefr_translation(item: dict) -> dict[str, str]:
    value = load_cefr_translations().get(item["id"], {})
    if isinstance(value, str):
        return {"chinese": value.strip(), "english": ""}
    return {
        "chinese": str(value.get("chinese", "")).strip(),
        "english": str(value.get("english", "")).strip(),
    }


def cefr_book_level(book: str) -> str | None:
    if not book.startswith("cefr-"):
        return None
    level = book.removeprefix("cefr-").upper()
    return level if level in {"A1", "A2", "B1", "B2"} else None


def seeded_random(seed: str | None) -> random.Random:
    return random.Random(seed) if seed else random.Random()


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/books")
def books() -> list[dict]:
    level_meta = cefr_levels()["levels"]
    return [
        {
            "id": f"cefr-{level['id'].lower()}",
            "name": f"CEFR {level['id']}",
            "count": level["count"],
            "kind": "cefr",
        }
        for level in level_meta
    ]


def build_cefr_distractors(
    target: dict,
    candidates: list[dict],
    rng: random.Random,
    count: int = 3,
) -> list[dict]:
    correct = get_cefr_translation(target)["chinese"]
    target_pos = target.get("part_of_speech", "")
    same_pos: list[dict] = []
    fallback: list[dict] = []
    seen_meanings: set[str] = set()

    for candidate in candidates:
        if candidate["id"] == target["id"]:
            continue
        translation = get_cefr_translation(candidate)
        meaning = translation["chinese"]
        if not meaning or meaning == correct or meaning in seen_meanings:
            continue
        seen_meanings.add(meaning)
        bucket = same_pos if candidate.get("part_of_speech", "") == target_pos else fallback
        bucket.append(
            {
                "label": meaning,
                "french": candidate["word"],
                "chinese": meaning,
                "english": translation["english"],
            }
        )

    rng.shuffle(same_pos)
    rng.shuffle(fallback)
    return (same_pos + fallback)[:count]


def cefr_learning_items(
    level: str,
    limit: int,
    shuffle: bool,
    seed: str | None = None,
) -> list[dict]:
    level_items = [
        dict(item)
        for item in load_cefr_words()
        if item["level"] == level and get_cefr_translation(item)["chinese"]
    ]
    rng = seeded_random(seed)

    if shuffle:
        rng.shuffle(level_items)
    else:
        level_items.sort(
            key=lambda item: (-item["level_frequency"], normalize_search(item["word"]))
        )

    result: list[dict] = []
    for item in level_items:
        translation = get_cefr_translation(item)
        distractor_rng = seeded_random(f"{seed}:{item['id']}:choices" if seed else None)
        distractors = build_cefr_distractors(item, level_items, distractor_rng, count=3)
        if len(distractors) < 3:
            continue

        choice_details = distractors + [
            {
                "label": translation["chinese"],
                "french": item["word"],
                "chinese": translation["chinese"],
                "english": translation["english"],
            }
        ]
        distractor_rng.shuffle(choice_details)
        choices = [choice["label"] for choice in choice_details]
        frequency = item.get("level_frequency")
        context = (
            f"本级频率：{frequency:.1f}"
            if isinstance(frequency, (int, float))
            else f"CEFR {level}"
        )
        result.append(
            {
                "id": item["id"],
                "french": item["word"],
                "phonetic": f"CEFR {level}",
                "part_of_speech": item.get("part_of_speech", ""),
                "chinese": translation["chinese"],
                "english": translation["english"],
                "example": context,
                "choices": choices,
                "choice_details": choice_details,
                "exercise_kind": "cefr-meaning",
            }
        )
        if len(result) >= limit:
            break

    return result


@app.get("/api/words")
def words(
    book: str = Query(default="cefr-a1"),
    limit: int = Query(default=30, ge=10, le=200),
    shuffle: bool = Query(default=True),
    day: str | None = Query(default=None, max_length=20),
) -> list[dict]:
    level = cefr_book_level(book)
    if not level:
        raise HTTPException(status_code=404, detail="Only CEFR A1-B2 books are available")

    seed = f"study:{day}:{book}:{limit}" if day else None
    result = cefr_learning_items(level, limit, shuffle, seed)
    if not result:
        raise HTTPException(
            status_code=422,
            detail="CEFR 中文释义数据为空，请检查 cefr_translations.json。",
        )
    return result


GrammarMode = Literal[
    "mixed",
    "pronoun",
    "verb",
    "preposition",
    "tense",
    "sentence",
    "gender",
    "wordform",
]


@app.get("/api/grammar")
def grammar(
    mode: GrammarMode = Query(default="mixed"),
    limit: int = Query(default=6000, ge=1, le=6000),
    shuffle: bool = Query(default=True),
) -> list[dict]:
    items = load_json("grammar.json")
    if mode != "mixed":
        items = [item for item in items if item["mode"] == mode]
    if shuffle:
        random.shuffle(items)
    return items[:limit]


@app.get("/api/spelling")
def spelling(
    book: str = Query(default="cefr-a1"),
    limit: int = Query(default=20, ge=1, le=10000),
    shuffle: bool = Query(default=True),
    day: str | None = Query(default=None, max_length=20),
) -> list[dict]:
    level = cefr_book_level(book)
    if not level:
        raise HTTPException(status_code=404, detail="Only CEFR A1-B2 books are available")

    items = [
        dict(item)
        for item in load_cefr_words()
        if item["level"] == level and get_cefr_translation(item)["chinese"]
    ]
    rng = seeded_random(f"spelling:{day}:{book}:{limit}" if day else None)

    if shuffle:
        rng.shuffle(items)
    else:
        items.sort(
            key=lambda item: (-item["level_frequency"], normalize_search(item["word"]))
        )

    result = []
    for item in items[:limit]:
        translation = get_cefr_translation(item)
        result.append(
            {
                "id": item["id"],
                "french": item["word"],
                "english": translation["english"],
                "chinese": translation["chinese"],
                "part_of_speech": item.get("part_of_speech", ""),
                "exercise_kind": "cefr-spelling",
                "level": level,
            }
        )
    return result


CefrLevel = Literal["A1", "A2", "B1", "B2"]
CefrSort = Literal["frequency", "alphabetical"]


@app.get("/api/cefr/levels")
def cefr_levels() -> dict:
    words = load_cefr_words()
    labels = {"A1": "入门", "A2": "基础", "B1": "中级", "B2": "中高级"}
    levels = [
        {
            "id": level,
            "label": labels[level],
            "count": sum(1 for item in words if item["level"] == level),
        }
        for level in ("A1", "A2", "B1", "B2")
    ]
    return {
        "total": len(words),
        "levels": levels,
        "source": "FLELex / Beacco, CENTAL - UCLouvain",
        "license": "CC BY-NC-SA 4.0",
        "note": "研究型教学分级资源，不是唯一或官方固定考试词表。",
    }


@app.get("/api/cefr/words")
def cefr_words(
    level: CefrLevel = Query(default="A1"),
    query: str = Query(default="", max_length=80),
    tag: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=48, ge=12, le=200),
    sort: CefrSort = Query(default="frequency"),
) -> dict:
    items = [dict(item) for item in load_cefr_words() if item["level"] == level]
    if tag:
        items = [item for item in items if item.get("tag") == tag]

    search = normalize_search(query.strip())
    if search:
        items = [item for item in items if search in normalize_search(item["word"])]

    if sort == "alphabetical":
        items.sort(key=lambda item: normalize_search(item["word"]))
    else:
        items.sort(key=lambda item: (-item["level_frequency"], normalize_search(item["word"])))

    for item in items:
        translation = get_cefr_translation(item)
        item["chinese"] = translation["chinese"]
        item["english"] = translation["english"]

    total = len(items)
    start = (page - 1) * page_size
    return {
        "level": level,
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": max(1, (total + page_size - 1) // page_size),
        "items": items[start : start + page_size],
    }
