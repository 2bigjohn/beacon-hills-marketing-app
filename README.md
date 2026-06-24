# Beacon Hills Marketing Studio

A social media marketing assistant for Beacon Hills restaurant (Aksarben Village, Omaha).
It turns a food photo or an event flyer into AI-written, brand-voiced captions, hashtags,
posting schedules, and Meta ad campaigns — with manual approval gates before anything is
scheduled or published.

The app is a React + Vite single-page app and installable PWA. It calls the **Anthropic API**
for AI content and the **Meta Graph / Marketing API** for scheduling and ads.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173/beacon-hills-marketing-app/
```

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

### Configuration

Open the **⚙️ Settings** tab in the running app and add:

- **Anthropic API key** — required; powers all AI features (captions, ideas, flyer analysis,
  ad creative). Get one at [console.anthropic.com](https://console.anthropic.com).
- **Meta credentials** (optional) — Page ID, Page access token, Instagram Business user ID,
  imgBB key, and Ad Account ID to enable scheduling and one-tap ad campaigns. The Settings
  tab includes a step-by-step guide.

Credentials are stored in `localStorage` on the device.

> ⚠️ **Security note:** the app currently calls the Anthropic API directly from the browser
> and stores keys in `localStorage`. This is fine for personal/single-device use but **not**
> safe for a public multi-user deployment. Moving secrets behind a server-side proxy is
> Phase 1 of [`ROADMAP.md`](./ROADMAP.md).

## Deployment

A GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
builds and deploys to **GitHub Pages** on every push to `main`. Enable it once under
**Settings → Pages → Source: GitHub Actions**. The live URL will be:

```
https://2bigjohn.github.io/beacon-hills-marketing-app/
```

The Vite `base` path defaults to `/beacon-hills-marketing-app/` for GitHub Pages. For hosts
that serve from the root (Vercel, Netlify, Cloudflare Pages), build with `BASE_PATH=/`:

```bash
BASE_PATH=/ npm run build
```

## Project structure

```
index.html                  Vite entry HTML
vite.config.js              Vite + PWA config (manifest, base path)
src/
  main.jsx                  React mount point
  BeaconHillsSocialAgent.jsx  The full app (UI, AI calls, Meta API integration)
public/icons/               PWA icons
legacy/                     The original vanilla-JS mock prototype (archived)
ROADMAP.md                  Phased improvement plan
```

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for the phased plan: securing API keys behind a proxy,
hardening the AI calls (structured outputs, streaming, retries, image downscaling), wiring
real Meta Insights analytics, and accessibility polish.

## Legacy prototype

The original clickable mock (vanilla HTML/CSS/JS, all output templated) lives in `legacy/`
for reference. It is no longer the active app and can be removed once the React app is
fully validated in production.
