# WiFi Pulse

A polished, mobile-first internet performance tester with two modes:

1. **Classic Speed Test** — browser-based ping, jitter, adaptive download and adaptive upload testing.
2. **Game Test / Packet Runner** — a 15-second playable mini-game that measures live ping, jitter, request failures, lightweight download throughput and browser frame stutters while you play.

## Features

- Responsive dark UI with animated speed gauge
- Classic ping / jitter / download / upload test
- Adaptive sample sizes to reduce unnecessary data use
- Playable canvas game with touch, keyboard and A/D controls
- Gaming quality score (0–100)
- Local-only test history using `localStorage`
- Installable PWA shell
- No account, database or paid backend required
- Ready for GitHub Pages or Netlify

## Run locally

Because browser networking rules are stricter for `file://` pages, serve the folder over HTTP:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

### Netlify

Import this repository into Netlify. No build command is required; publish directory is `.`.

### GitHub Pages

Enable Pages for the repository and serve from the `main` branch root.

## How measurements work

The browser uses public Cloudflare Speed Test edge endpoints for timing and transfer samples. The Classic test uses multiple samples and median values to reduce one-off spikes. Game Test continuously samples HTTP request latency while Packet Runner is active.

Browser-based results are **estimates**, not laboratory measurements. Results can differ from Ookla Speedtest, your ISP's test, or an actual game server because providers use different servers, protocols, routes and measurement methods. "Request loss" is the percentage of timed browser test requests that fail or time out; it is not ICMP packet loss.

A speed test can use a meaningful amount of data. WiFi Pulse uses adaptive transfer sizes, but users on metered/mobile data should test carefully.

## Privacy

WiFi Pulse itself does not run a user database or analytics service. Test history is saved only in the browser. Network test requests go to Cloudflare's Speed Test service, so Cloudflare receives the network information required to serve those requests under its own policies.

## Disclaimer

This is an independent project and is not affiliated with Ookla or Cloudflare. "Speedtest" is commonly used to describe internet speed measurement; Ookla and Speedtest by Ookla are trademarks of their respective owner.
