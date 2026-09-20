from __future__ import annotations

import os
import secrets
import threading
import time
from collections import defaultdict
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parents[2]
app = Flask(__name__, static_folder=str(ROOT), static_url_path="")

MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", "8192"))
MAX_SPEEDTEST_BYTES = int(os.getenv("MAX_SPEEDTEST_BYTES", str(50 * 1024 * 1024)))
RATE_WINDOW_SECONDS = int(os.getenv("RATE_WINDOW_SECONDS", "60"))
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "80"))
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "0") == "1"

_hits: dict[str, list[float]] = defaultdict(list)
_hits_lock = threading.Lock()
PAYLOAD = secrets.token_bytes(1024 * 1024)


def client_key() -> str:
    if TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
    return request.remote_addr or "unknown"


@app.before_request
def api_guard():
    if not request.path.startswith("/api/"):
        return None

    limit = MAX_SPEEDTEST_BYTES if request.path == "/api/upload" else MAX_BODY_BYTES
    if request.content_length and request.content_length > limit:
        return jsonify(error="request too large"), 413

    now = time.monotonic()
    key = client_key()
    with _hits_lock:
        recent = [stamp for stamp in _hits[key] if now - stamp < RATE_WINDOW_SECONDS]
        if len(recent) >= RATE_LIMIT:
            return jsonify(error="rate limit exceeded"), 429
        recent.append(now)
        _hits[key] = recent

        if len(_hits) > 10000:
            stale_before = now - RATE_WINDOW_SECONDS
            for candidate in list(_hits)[:1000]:
                if not _hits[candidate] or _hits[candidate][-1] < stale_before:
                    _hits.pop(candidate, None)
    return None


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "connect-src 'self' https://speed.cloudflare.com; "
        "img-src 'self' data:; style-src 'self'; script-src 'self'; "
        "font-src 'self'; object-src 'none'; base-uri 'self'; "
        "frame-ancestors 'none'; form-action 'none'"
    )
    return response


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/api/health")
def health():
    return jsonify(
        status="ok",
        service="wifi-pulse-python",
        version="3",
        timestamp=time.time(),
    )


@app.get("/api/download")
def download():
    try:
        size = int(request.args.get("bytes", "1048576"))
    except ValueError:
        return jsonify(error="invalid bytes"), 400

    if size < 1:
        return jsonify(error="bytes must be positive"), 400
    size = min(size, MAX_SPEEDTEST_BYTES)

    def generate():
        remaining = size
        while remaining:
            chunk_size = min(remaining, len(PAYLOAD))
            yield PAYLOAD[:chunk_size]
            remaining -= chunk_size

    return Response(
        generate(),
        mimetype="application/octet-stream",
        headers={
            "Content-Length": str(size),
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
            "X-WiFi-Pulse-Test": "download",
        },
    )


@app.post("/api/upload")
def upload():
    total = 0
    while True:
        chunk = request.stream.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_SPEEDTEST_BYTES:
            return jsonify(error="upload too large"), 413
    return jsonify(received=True, bytes=total)


def score_metrics(ping: float, jitter: float, download: float, upload: float, loss: float):
    score = max(
        0,
        min(
            100,
            round(
                100
                - min(35, ping / 4)
                - min(20, jitter * 1.5)
                - min(20, loss * 2)
                - max(0, 30 - min(30, download)) / 1.5
            ),
        ),
    )
    grade = (
        "Excellent"
        if score >= 90
        else "Very good"
        if score >= 75
        else "Good"
        if score >= 55
        else "Fair"
        if score >= 35
        else "Poor"
    )
    return score, grade


@app.post("/api/analyze")
def analyze():
    data = request.get_json(silent=True) or {}
    try:
        values = {
            key: float(data.get(key, 0))
            for key in ("ping", "jitter", "download", "upload", "loss")
        }
    except (TypeError, ValueError):
        return jsonify(error="invalid metrics"), 400

    limits = {
        "ping": 60000,
        "jitter": 60000,
        "download": 100000,
        "upload": 100000,
        "loss": 100,
    }
    if any(values[key] < 0 or values[key] > limits[key] for key in values):
        return jsonify(error="metrics outside allowed range"), 400

    score, grade = score_metrics(**values)
    return jsonify(score=score, grade=grade)


@app.errorhandler(404)
def static_fallback(_):
    path = request.path.lstrip("/")
    candidate = ROOT / path
    if path and candidate.is_file() and ROOT in candidate.resolve().parents:
        return send_from_directory(ROOT, path)
    return jsonify(error="not found"), 404


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        debug=False,
    )
