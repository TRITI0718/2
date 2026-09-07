from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_interface_assets_cannot_be_served_from_stale_cache():
    for path in ("/", "/static/css/styles.css", "/static/js/app.js"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store, max-age=0"


def test_books_are_available():
    response = client.get("/api/books")
    assert response.status_code == 200
    books = response.json()
    assert len(books) >= 7
    assert {book["id"] for book in books} >= {
        "a1-core",
        "a2-daily",
        "verbs-core",
        "cefr-a1",
        "cefr-a2",
        "cefr-b1",
        "cefr-b2",
    }
    assert all(book["count"] > 0 for book in books)


def test_word_choices_have_four_options_and_answer():
    response = client.get("/api/words?book=a1-core&shuffle=false")
    assert response.status_code == 200
    for item in response.json():
        assert len(item["choices"]) == 4
        assert item["chinese"] in item["choices"]


def test_cefr_book_supplies_learning_questions():
    response = client.get("/api/words?book=cefr-a1&limit=8&shuffle=false")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 8
    for item in items:
        assert item["exercise_kind"] == "cefr-pos"
        assert len(item["choices"]) == 4
        assert item["part_of_speech"] in item["choices"]


def test_spelling_uses_selected_cefr_book():
    response = client.get("/api/spelling?book=cefr-b1&limit=8&shuffle=false")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 8
    assert all(item["exercise_kind"] == "cefr-spelling" for item in items)
    assert all(item["level"] == "B1" and item["french"] for item in items)


def test_each_grammar_question_has_four_options_and_answer():
    response = client.get("/api/grammar?mode=mixed&shuffle=false")
    assert response.status_code == 200
    for item in response.json():
        assert len(item["options"]) == 4
        assert item["answer"] in item["options"]


def test_cefr_levels_include_a1_to_b2():
    response = client.get("/api/cefr/levels")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 8767
    assert {level["id"] for level in payload["levels"]} == {"A1", "A2", "B1", "B2"}
    assert all(level["count"] > 0 for level in payload["levels"])


def test_cefr_words_support_filters_and_pagination():
    response = client.get("/api/cefr/words?level=A1&tag=VER&page=1&page_size=12")
    assert response.status_code == 200
    payload = response.json()
    assert payload["level"] == "A1"
    assert len(payload["items"]) == 12
    assert all(item["level"] == "A1" and item["tag"] == "VER" for item in payload["items"])

    search = client.get("/api/cefr/words?level=A1&query=etre&page_size=12")
    assert search.status_code == 200
    assert any(item["word"] == "être" for item in search.json()["items"])
