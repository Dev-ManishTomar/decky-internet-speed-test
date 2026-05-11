# Internet Speed Test - Decky Plugin

Internet speed test plugin for [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) on Steam Deck / SteamOS.

Measures download speed, upload speed, ping, and jitter using Cloudflare's global edge network — the same methodology used by [speed.cloudflare.com](https://speed.cloudflare.com).

## Features

- Real-time download and upload speed measurement with live SVG charts
- Ping and jitter measurement (20 samples, median)
- Progressive test sizes following Cloudflare's methodology (90th percentile)
- Cloudflare edge server location display
- Test history (last 5 results, persisted to disk)
- Collapsible history section
- Gamepad-navigable UI using native Steam Deck components
- No external dependencies — runs entirely in the browser

## Installation

### Via Decky Loader (Manual Install)

1. Download the [latest release](https://github.com/Dev-ManishTomar/decky-internet-speed-test/releases)
2. Extract to `~/homebrew/plugins/`
3. Restart Decky Loader

### From Source

```bash
git clone https://github.com/Dev-ManishTomar/decky-internet-speed-test.git
cd decky-internet-speed-test
pnpm i
pnpm run build
```

## Development

### Requirements

- Node.js v16.14+
- pnpm v9+

### Deploy to Steam Deck

1. Enable SSH on your Deck: `sudo systemctl enable --now sshd`
2. Copy `.env.deck.example` to `.env.deck` and set your Deck's IP
3. Deploy:

```bash
./deploy.sh              # Build + deploy (auto-reloads in Game Mode)
./deploy.sh --watch      # Auto-deploy on every file change
./deploy.sh --logs       # Tail backend Python logs
./deploy.sh --restart    # Deploy + restart Steam
```

## Architecture

- **Frontend (TypeScript/React)**: Speed test engine runs entirely in the browser using `fetch()` against Cloudflare's `__down`/`__up` endpoints. Real-time SVG charts built with smooth Catmull-Rom curves.
- **Backend (Python)**: Minimal — only handles test history persistence to disk.

## License

BSD-3-Clause
