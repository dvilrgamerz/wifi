# WiFi Pulse

**WiFi Pulse** is a polished, mobile-first browser app for testing internet performance in two different ways.

## 1) Classic Speed Test

A familiar speed-test experience inspired by modern tools such as Speedtest by Ookla:

- Ping
- Jitter
- Download speed
- Upload speed
- Adaptive test sizes
- Animated live gauge
- Connection-quality summary
- Local result history

## 2) Signal Survivor — Game Network Test

An original endless top-down survival game that measures how your connection behaves while you are actually playing.

Gameplay includes:

- Endless enemy waves
- 360-degree movement
- Auto-firing weapons
- XP gems and leveling
- Random upgrade choices
- Health, kills, level and survival-time HUD
- Regular, elite and boss enemies
- Increasing difficulty
- Keyboard controls
- Mobile touch controls
- Drag-to-move support

While the run is active, WiFi Pulse continuously measures:

- Live ping
- Jitter
- Browser request failures
- Lightweight download throughput
- Frame stutters
- Overall gaming-quality score

## Features

- Modern responsive dark UI
- Two clearly separated test modes
- Mobile-first layout
- Installable PWA
- Offline app shell
- Local-only result history with `localStorage`
- No login
- No database
- No paid backend required
- Netlify-ready
- GitHub Pages-ready

## Run locally

Serve the folder over HTTP:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

### Netlify

Import this repository into Netlify. No build command is required. Publish directory: `.`

### GitHub Pages

Enable GitHub Pages and deploy from the root of the `main` branch.

## Measurement notes

WiFi Pulse uses public Cloudflare Speed Test edge endpoints for browser-based timing and transfer samples.

The Classic mode uses repeated measurements and median values to reduce one-off spikes. Signal Survivor keeps collecting lightweight network samples while gameplay continues.

Results are estimates and can differ from Ookla Speedtest, ISP tests, or actual game servers because each service may use different servers, routing, protocols and testing methods.

“Request loss” means browser test requests that failed or timed out. It is not the same thing as ICMP packet loss.

Speed testing can use a meaningful amount of data. WiFi Pulse uses adaptive transfer sizes, but users on metered connections should test carefully.

## Privacy

WiFi Pulse does not run its own user database or analytics service. Test history remains in the browser unless the user manually clears it.

Network test requests are sent to Cloudflare’s Speed Test service, so Cloudflare receives the network information necessary to serve those requests under its own policies.

## Disclaimer

WiFi Pulse is an independent project and is not affiliated with Ookla, Survivor.io, or Cloudflare.

The survival game is an original implementation inspired by the general endless-survival genre. It does not copy Survivor.io artwork, characters, names, levels, or proprietary assets.
