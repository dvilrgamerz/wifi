# WiFi Pulse Pro

**Know when your internet fails. Understand what the evidence can and cannot prove.**

[Live browser monitor](https://wifi-pulse-v2.netlify.app/#monitorPanel) · [Desktop local diagnostics](#desktop-local-diagnostics) · [Source](https://github.com/dvilrgamerz/wifi) · [Tests](https://github.com/dvilrgamerz/wifi/actions)

WiFi Pulse Pro combines an approachable opt-in browser monitor with a more informative local diagnostic tool. No account is needed. The existing speed test and Signal Survivor game remain available.

## What works in Pro

| Capability | Browser | Local agent |
| --- | --- | --- |
| Monitor over time | Yes, while page is visible | Yes, while the program runs |
| Connection failure history | Same-site HTTP failures | Fixed external TCP target failures |
| Latency / variation | HTTP response time | TCP connect time and adjacent variation |
| Suspected interruptions | Two consecutive failed checks | Two consecutive two-target failures |
| Timestamped history and recovery | Observed checks, not exact outage boundaries | Observed checks, not exact outage boundaries |
| ISP-friendly report | One-click text and raw CSV | Local text and raw CSV |
| Test gateway separately | No — browser sandbox | Yes, using ICMP if allowed |
| PC vs Wi-Fi vs ISP | Insufficient evidence; explicitly uncertain | Tentative local/upstream clues, not proof |
| Works after closing browser | No | Only while agent runs |
| Account and telemetry | None | None |

## Browser: 3 steps

1. Open the [live WiFi Pulse Pro monitor](https://wifi-pulse-v2.netlify.app/#monitorPanel) in a visible browser tab.
2. Press **Start monitoring**. A lightweight no-cache HTTP request tests this website about every 5 seconds.
3. After a problem occurs, press **Download ISP report** and **Download raw CSV**. The timeline groups two or more sequential failed checks and marks any observed recovery.

**Important:** Browser tabs are not background services; monitoring pauses when hidden, suspended, or closed. HTTP failures are not ICMP packet loss. The website or CDN can fail independently of your ISP. First failed checks are not exact physical outage start times. The exports state these limitations.

## Desktop local diagnostics

The optional agent runs on your own PC. It compares the local router gateway with two independent internet endpoints. It is a standard-library Python program, not a public API, browser extension, or LAN scanner.

**Windows (simple):** Install Python 3.10+, open the desktop-agent folder, then double-click the start-windows.bat file. Keep its terminal open and press Ctrl+C to stop.

**Windows, macOS or Linux (terminal):**

    python desktop-agent/wifi_pulse_agent.py --interval 5 --output wifi-pulse-pro

Try a short test:

    python desktop-agent/wifi_pulse_agent.py --count 12 --interval 5

If automatic gateway detection fails, use your router's real private IPv4 address:

    python desktop-agent/wifi_pulse_agent.py --gateway 192.168.1.1

The agent creates **wifi-pulse-pro.csv** (flushed after each check) and **wifi-pulse-pro.txt** when stopped normally. Select a different output prefix using --output. Files remain on your computer.

### Reading the local diagnosis

- **Gateway answers; both public endpoints fail:** Possible WAN/router-uplink or upstream interruption. Endpoint, VPN, firewall, and filtering failures remain plausible.
- **Gateway and both public endpoints fail:** PC, Wi-Fi, router, and ISP causes cannot yet be separated.
- **Internet works but gateway ICMP fails:** The router may block ping, even if it is healthy.
- **One public endpoint works:** Possible route- or endpoint-specific issue; not proof of a full outage.
- **Both public endpoints work:** Those two network paths answered at that moment. Other services can still fail.

The tool sends ICMP to the detected IPv4 gateway and attempts TCP connections to 1.1.1.1:443 and 8.8.8.8:443. TCP connection time is not webpage load time or ICMP ping. The app does not currently measure true Wi-Fi radio signal strength, hop-by-hop traceroute, DNS resolution, or IPv6. These gaps matter when attributing blame.

**Better evidence:** Compare Ethernet and Wi-Fi on the same PC and test a second device during the incident. Export exact observations and share the report without claiming the ISP is definitively at fault.

### Privacy and security

No login, ad trackers, cloud database, network scanning, admin privileges or data uploading by WiFi Pulse. Reports may include your local gateway address, so review them before sharing. Manual gateway input is validated as a private IPv4 address, and the ping command uses an argument array instead of a shell.

## Development and quality checks

    node --check monitor-metrics.js
    node --check network-monitor.js
    node --test tests/network-monitor.test.cjs tests/network-pro.test.cjs
    python -m unittest discover -s desktop-agent -p "test_*.py"

The original Flask API, PWA, speed tests and game tests remain in CI.

## Competitor comparison and next milestones

This is a real functionality upgrade, **not full parity** with established tools such as PingPlotter or Net Uptime Monitor. Those tools offer features this project still lacks: per-hop route visualizations, background tray services, configurable notifications, extensive historical graphs, and advanced packet-probe choices.

**Priority roadmap (not implemented yet):** Windows portable executable and installer, tray monitoring and startup behavior, customizable endpoints/alerts, DNS and IPv6 tests, per-hop traceroute, searchable daily histories, printable charts, additional data retention controls and end-to-end tests on physical Windows machines.

---

## Legacy V2 features

The original V2 documentation below describes the existing browser speed test, Signal Survivor game, optional Flask backend and PWA features. Those capabilities remain in WiFi Pulse Pro.

<!-- DVILR PROJECT COVER v1 -->
<p align="center"><img src="./assets/dvilr-project-banner.svg" width="100%" alt="WiFi Pulse V2: Test network stability, speed and gaming readiness." /></p>
<p align="center"><a href="https://github.com/dvilrgamerz"><strong>Developer profile</strong></a> · <a href="https://github.com/dvilrgamerz/wifi"><strong>Source</strong></a> · <a href="https://wifi-pulse-v2.netlify.app"><strong>Live app ↗</strong></a></p>
<!-- /DVILR PROJECT COVER -->

# 📶 WiFi Pulse V2 (legacy details)

<p align="center">
  <strong>A modern browser internet diagnostics lab + an original game that tests your connection while you play.</strong>
</p>

<p align="center">
  <a href="https://github.com/dvilrgamerz/wifi/actions"><img alt="CI" src="https://github.com/dvilrgamerz/wifi/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-3.0.0-7c3aed">
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

## Connection monitor (new, no game required)

The main page now includes a **Live HTTP connection stability** panel separate from the speed test and Signal Survivor. Select **Start monitoring** to measure this website's small `monitor-probe.txt` endpoint every five seconds.

- Track median HTTP response time and median absolute change between adjacent successful readings.
- Track successful and failed HTTP requests and view the latest 50 measurements in a graph.
- Export the current tab's bounded (up to 120 samples) history as CSV.
- Monitoring is opt-in, pauses while the tab is hidden or the browser reports offline, and stops when you leave the page.
- No cookies, login, device scans or monitoring telemetry are sent to a separate analytics service.

**Measurement limits:** browser HTTP timing is **not** Wi-Fi signal strength or ICMP ping; request failures are **not** measured network packet loss. The server/CDN, device load, network path and browser scheduling all affect these numbers. The monitor works on static Netlify hosting and on the optional Flask backend without privileged OS access.

The tiny `monitor-probe.txt` endpoint intentionally bypasses service-worker caching. `node --test tests/network-monitor.test.cjs` runs metric and endpoint-isolation checks.
