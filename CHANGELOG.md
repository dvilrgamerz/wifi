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
