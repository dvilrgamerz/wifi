import os

os.environ["RATE_LIMIT"] = "1000"

from app import app


def client():
    app.config.update(TESTING=True)
    return app.test_client()


def test_health():
    response = client().get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_download_exact_size_and_bounds():
    c = client()
    assert c.get("/api/download?bytes=0").status_code == 400
    response = c.get("/api/download?bytes=128")
    assert response.status_code == 200
    assert len(response.data) == 128


def test_upload_reports_received_bytes():
    response = client().post("/api/upload", data=b"wifi-pulse")
    assert response.status_code == 200
    assert response.get_json()["bytes"] == len(b"wifi-pulse")


def test_analyze_validates_metrics():
    c = client()
    response = c.post(
        "/api/analyze",
        json={"ping": 20, "jitter": 3, "download": 100, "upload": 20, "loss": 0},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert 0 <= body["score"] <= 100
    assert body["grade"]

    assert c.post("/api/analyze", json={"ping": -1}).status_code == 400
    assert c.post("/api/analyze", json={"loss": 101}).status_code == 400


def test_frontend_is_served():
    response = client().get("/")
    assert response.status_code == 200
    assert b"WiFi Pulse" in response.data
