# Contributing to WiFi Pulse

Thanks for helping improve WiFi Pulse.

## Development workflow

1. Fork the repository or create a feature branch.
2. Keep each change focused and easy to review.
3. Run the frontend syntax checks and Python tests.
4. Test both Classic Speed Test and Signal Survivor in a browser.
5. Open a pull request with what changed, how you tested it, and screenshots for visible UI changes.

## Local static mode

```bash
python -m http.server 8080
```

Open `http://localhost:8080`. Static mode automatically uses Cloudflare speed-test endpoints.

## Local full-stack mode

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/python/requirements.txt
python backend/python/app.py
```

Open `http://127.0.0.1:8000`. The frontend will automatically use the local WiFi Pulse backend.

## Tests

```bash
node --check app.js
node --check insights.js
node --check sw.js
cd backend/python
pytest -q
```

## Pull-request guidelines

- Do not add passwords, tokens, API secrets, private IP data, or credentials.
- Keep the app usable without paid APIs.
- Do not copy proprietary artwork, code, names, or assets from commercial games.
- Explain measurement limitations accurately.
- Prefer accessible controls and responsive layouts.
