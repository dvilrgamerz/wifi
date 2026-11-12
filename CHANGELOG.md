# Changelog

## 3.0.0 — WiFi Pulse Pro

- Added connection-failure incident timeline with observed start and recovery boundaries.
- Added one-click text ISP evidence report and raw CSV export from browser monitor.
- Added uncertainty-aware, single-endpoint diagnostics instead of false ISP blame.
- Added opt-in local desktop agent with gateway ICMP plus two public TCP targets.
- Added local agent CSV/text evidence files, short-run CLI options, Windows launcher and route-override validation.
- Detects monitoring gaps and avoids falsely treating browser pauses or computer sleep as observed uptime/downtime.
- Simplified the monitor's interface and added an expandable clear guidance section and responsive event list.
- Added regression tests and updated continuous integration.

**Limitations:** No signed executable, no browser-based router diagnosis, no Wi-Fi strength measurement or traceroute, and no guaranteed full-background monitoring. Diagnosis is suggestive, not conclusive.

---

# Changelog

## 2.0.1

### Signal Survivor polish
- Added clear run-state indicators: READY, RUNNING, PAUSED, LEVEL UP, GAME OVER
- Added Pause/Resume and End Run controls
- Added keyboard shortcuts: P to pause, Esc to end, 1/2/3 to select upgrades
- Improved mobile touch controls and control layout
- Improved upgrade-card focus and accessibility
- Hardened restart behavior so a fresh run clears stale upgrade UI

## 2.0.0

WiFi Pulse V2 is the current major release.

### Added
- Adaptive multi-stream download testing
- Adaptive multi-stream upload testing
- Longer warm-up and measurement windows
- Improved latency and jitter sampling
- Signal Survivor live network-quality testing
- Automatic local Python backend detection
- Cloudflare fallback for static hosting
- Optional Flask backend
- Docker and Docker Compose support
- GitHub Actions frontend/backend CI
- Security policy and hardened response headers
- PWA install/offline support
- Local result history

### Improved
- Upload-speed accuracy
- Download-speed saturation
- PWA cache refresh behavior
- README and contributor documentation
- Project structure and production asset naming

### Notes
Browser-based speed tests can still differ from other providers because test servers, routes, browser behavior, and measurement methods are different.
