# 📶 WiFi Pulse V2

<p align="center">
  <strong>A modern browser internet diagnostics lab + an original game that tests your connection while you play.</strong>
</p>

<p align="center">
  <a href="https://github.com/dvilrgamerz/wifi/actions"><img alt="CI" src="https://github.com/dvilrgamerz/wifi/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-2.0.0-7c3aed">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-HTML%20%2B%20CSS%20%2B%20JavaScript-orange">
  <img alt="Backend" src="https://img.shields.io/badge/backend-optional%20Python%20%2F%20Flask-green">
</p>

<p align="center">
  <a href="https://wifi-pulse-v2.netlify.app"><strong>🌐 Live Demo — WiFi-Pulse-v2.netlify.app</strong></a>
</p>

---

## 🚀 V2

**WiFi Pulse V2** is the current major release.

V2 includes:
- adaptive multi-stream download and upload testing
- improved latency and jitter sampling
- automatic backend detection with Cloudflare fallback
- Signal Survivor live network testing
- PWA/offline support
- local result history
- optional Python/Flask backend
- Docker support
- GitHub Actions CI
- stronger security headers and validation

See [CHANGELOG.md](CHANGELOG.md) for release notes.

---

## ⚡ Two ways to test your connection

### 1. Classic Speed Test

WiFi Pulse runs a real browser-based connection test and reports:

- **Ping**
- **Jitter**
- **Download speed** (adaptive multi-stream)
- **Upload speed** (adaptive multi-stream)
- **Connection score**
- **Gaming readiness**
- **4K streaming readiness**
- **Video-call readiness**
- **Connection stability**
- Local browser history and copyable results

The upgraded engine automatically chooses the best available test path:

```text
WiFi Pulse frontend
      │
      ├── local/full-stack deployment ──► WiFi Pulse Python backend
      │
      └── static/Netlify deployment ────► Cloudflare speed-test edge
```

No user has to configure this manually.

### 2. ☄️ Signal Survivor

Signal Survivor turns network diagnostics into an endless top-down survival game.

**Gameplay**
- Endless waves
- Auto-firing weapons
- XP gems and leveling
- Upgrade choices with 1/2/3 keyboard shortcuts
- Regular, elite and boss enemies
- Increasing difficulty
- Clear Start / Restart / Pause / Resume / End Run controls
- WASD, arrow keys, pointer and larger mobile touch controls
- Live READY / RUNNING / PAUSED / LEVEL UP / GAME OVER status

**Live network measurements**
- Ping
- Jitter
- Lightweight throughput samples
- Browser request failures
- Frame-stutter tracking
- Gaming-quality score

The game is an original implementation inspired by the general endless-survival genre. It does **not** copy commercial game artwork, characters, code, names, maps or proprietary assets.

---

## 🧠 Why WiFi Pulse is different

Most speed tests end when the number appears.

WiFi Pulse gives you both a normal speed test **and** a longer real-world gaming-style stress test. Signal Survivor keeps measuring connection behavior while the browser is also rendering and running gameplay.

This makes it useful for seeing the difference between:

- high bandwidth vs. good latency
- average ping vs. jitter spikes
- a fast connection vs. a stable connection
- network problems vs. browser/device frame stutters

---

## 🏗️ Project structure

```text
wifi/
├── index.html
├── app.js                    # main speed-test + Signal Survivor engine
├── insights.js                     # UI insights, scoring and PWA enhancements
├── styles.css
├── game.css
├── insights.css
├── manifest.webmanifest
├── sw.js
├── netlify.toml
│
├── backend/
│   ├── .env.example
│   └── python/
│       ├── app.py            # optional Flask speed-test API
│       ├── requirements.txt
│       └── test_app.py
│
├── .github/
│   ├── workflows/ci.yml
│   └── pull_request_template.md
├── Dockerfile
├── docker-compose.yml
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

---

## 🚀 Run it

### Fastest: static mode

No dependencies are required.

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

The browser automatically falls back to Cloudflare for test traffic.

### Full-stack mode

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate

# macOS/Linux
# source .venv/bin/activate

python -m pip install -r backend/python/requirements.txt
python backend/python/app.py
```

Then open:

```text
http://127.0.0.1:8000
```

WiFi Pulse automatically detects the Python backend and uses it for download/upload test traffic.

### Docker

```bash
docker compose up --build
```

Then visit `http://localhost:8000`.

---

## 🌐 Deployment

### Netlify / GitHub Pages / static hosting

Deploy the repository root as a static site. No build command is required.

Static deployments automatically use Cloudflare speed-test endpoints.

### Full-stack hosting

Use the included Dockerfile or run the Flask app behind a production WSGI server and HTTPS.

The backend includes:

- request-size limits
- per-client API rate limiting
- defensive browser security headers
- proxy-header trust disabled by default
- bounded download/upload test sizes
- metric validation
- automated regression tests

> A public speed-test server can consume substantial bandwidth. Set conservative limits and monitor public deployments.

---

## ✅ Quality checks

GitHub Actions automatically checks:

- JavaScript syntax
- required frontend assets
- frontend entry-point consistency
- Python compilation
- Flask regression tests

Run them locally:

```bash
node --check app.js
node --check insights.js
node --check sw.js

cd backend/python
pytest -q
```

---

## 🔐 Privacy

WiFi Pulse intentionally has:

- **no login**
- **no password database**
- **no SQL database**
- **no advertising tracker**
- **no analytics database**
- local-only result history

Static-mode network test traffic is sent to Cloudflare's speed-test service. Full-stack mode can use your own WiFi Pulse backend instead.

A normal website cannot reliably read your Wi-Fi password, router password, Wi-Fi channel, or true radio signal strength.

---

## 📏 Measurement notes

Browser speed tests are estimates of the path between your device and the selected test endpoint. WiFi Pulse uses warm-up passes, multiple latency samples, adaptive transfer sizes, and parallel streams to reduce short-test under-reading. Results can vary because of:

- Wi-Fi distance and interference
- router load
- VPNs/proxies
- ISP congestion
- device load
- browser behavior
- server location and routing

"Request loss" in Signal Survivor means browser test requests that failed or timed out. It is **not** the same as ICMP packet loss.

For better comparisons, run multiple tests and compare Wi-Fi against Ethernet where possible.

---

## 🛡️ Responsible use

Only test networks and infrastructure you are authorized to use. Do not use the project to intentionally overwhelm test endpoints or hosting infrastructure.

See [SECURITY.md](SECURITY.md) for security reporting and deployment guidance.

---

## 🤝 Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

<p align="center">
  <strong>WiFi Pulse</strong><br>
  Speed. Stability. Survival. 📶☄️
</p>
