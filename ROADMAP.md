# Beacon Hills Marketing App — Improvement Roadmap

_Last updated: 2026-06-24_

## Where things stand

The repo currently contains **two separate apps** plus supporting assets:

| File(s) | What it is | Runs today? | Uses real APIs? |
|---|---|---|---|
| `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.webmanifest` | Vanilla-JS PWA prototype | ✅ Yes | ❌ No — all output is templated mock text |
| `BeaconHillsSocialAgent.jsx` | React app with live Anthropic + Meta integration | ❌ No — orphan file, no build setup | ✅ Yes |

There is **no `package.json`** and no bundler, so the React app — the one with real
functionality — cannot run in a browser. This is the root issue the roadmap addresses.

**Guiding decision:** consolidate on the React app and retire the vanilla mock. The mock
served its purpose as a clickable prototype; keeping both in sync is wasted effort.

---

## Phase 0 — Make the React app runnable _(blocker for everything)_

**Goal:** `npm run dev` opens a working app; the project can be deployed to a live URL.

- Add `package.json` with `react`, `react-dom`, `recharts`, `vite`, `@vitejs/plugin-react`.
- Add `vite.config.js`, a real `index.html` entry point, and `src/main.jsx` that mounts
  `BeaconHillsSocialAgent`.
- Move `BeaconHillsSocialAgent.jsx` into `src/`.
- Port the PWA pieces that are worth keeping (manifest, service worker, icons) into the
  Vite build via `vite-plugin-pwa`.
- Decide the fate of `app.js` / `index.html` (the mock): delete, or archive under `legacy/`.

**Effort:** ~half a day. **Unblocks:** a real live link, plus every phase below.

---

## Phase 1 — Security: get secrets out of the browser _(highest-risk issue)_

**Problem.** The app stores the **Anthropic API key** and **Meta page tokens** in
`localStorage` and calls Anthropic directly from the browser using the
`anthropic-dangerous-direct-browser-access` header. Consequences:

- The API key is readable by anyone with the device, and by any XSS vulnerability.
- The Meta token carries `ads_management` scope — a leaked token can spend ad money.
- "Dangerous direct browser access" is a development convenience, not a production pattern.

**Fix.** Introduce a thin server-side proxy (serverless functions on Vercel / Netlify /
Cloudflare):

- `POST /api/anthropic` — holds `ANTHROPIC_API_KEY` as a server env var, forwards the
  request to `api.anthropic.com`. The browser never sees the key.
- `POST /api/meta/*` — same pattern for Graph API calls; Meta tokens stored server-side
  (or in an encrypted session), never in `localStorage`.
- Remove the API-key and token fields from the client Settings tab (or keep only a
  "signed in / not signed in" indicator).

**Effort:** ~1 day. **Depends on:** Phase 0. **Note:** also the moment to add a basic
auth gate so not just anyone can hit your proxy and spend your credits.

---

## Phase 2 — Reliability & speed of the AI features

These make the existing features robust instead of fragile. All are in
`BeaconHillsSocialAgent.jsx` today.

1. **Structured outputs instead of regex JSON.** Every AI call currently does
   `raw.replace(/```json|```/g,"").trim()` then `JSON.parse(...)`. A single stray token
   throws and the feature silently fails. Switch to **tool-use / structured outputs** so
   Claude is forced to return schema-valid JSON. Highest robustness-per-hour change here.
2. **Retry with backoff** on HTTP 429 (rate limit) and 529 (overloaded) — currently a
   transient blip kills the request.
3. **Streaming responses.** Captions appear all-at-once after a multi-second stall.
   Stream them so output renders as it's generated.
4. **Downscale images before upload.** Full-size base64 originals are sent to the API —
   slow and expensive. Resize to ~1568px max edge first. (The vanilla `app.js` already
   has a `compressImage` canvas helper that can be lifted.)

**Effort:** ~1–2 days. **Depends on:** Phase 1 (calls now go through the proxy).

---

## Phase 3 — Close real product gaps

1. **Real analytics.** The Analytics tab computes everything from local post history — the
   numbers are not real. Wire up the **Meta Insights API** for actual reach, impressions,
   and engagement.
2. **Post now.** Today you can only *schedule*. Add immediate organic publish.
3. **Instagram carousels.** Multi-image upload exists, but only single images post. Support
   IG carousel containers.
4. **Show web-search citations.** The Ideas tab searches the web but discards the sources;
   surface them so the chef can trust the "why now" reasoning.

**Effort:** ~2–3 days, can be done feature-by-feature. **Depends on:** Phases 0–1.

---

## Phase 4 — Polish & maintainability

- **Accessibility:** modals need focus trapping + escape-to-close; several interactive
  elements are clickable `div`s rather than real buttons.
- **Undo on delete:** post deletion is instant and destructive — add an undo window.
- **De-duplicate brand voice constants:** `BRAND` and `BH_PROFILE` overlap; consolidate to
  one source of truth so the voice stays consistent.
- **Extract inline styles:** the single `S` style object and inline styles are large;
  consider CSS modules for maintainability (optional).

**Effort:** ~1 day, low risk, can be done incrementally.

---

## Suggested sequence

```
Phase 0 (runnable)  ──►  Phase 1 (security)  ──►  Phase 2 (reliability)
                                            └────►  Phase 3 (features)
                                                     Phase 4 (polish, anytime)
```

Phase 0 and Phase 1 are the two that genuinely block a safe public launch. Everything
after that is incremental value and can be prioritized by what matters most to the
restaurant — most likely **real analytics** and **post-now** in Phase 3.
