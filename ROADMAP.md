# Beacon Hills Marketing App — Improvement Roadmap

_Last updated: 2026-06-24_

## Where things stand

| Phase | Status |
|---|---|
| Phase 0 — Make the React app runnable | ✅ **Done** |
| Phase 1 — Security: secrets server-side | ✅ **Done** |
| Phase 2 — Reliability & AI hardening | Pending |
| Phase 3 — Product gaps | Pending |
| Phase 4 — Polish | Pending |

---

## Phase 0 — Make the React app runnable ✅ Done

Added `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`. Moved
`BeaconHillsSocialAgent.jsx` to `src/`. Wired up `vite-plugin-pwa`. Added GitHub Actions
workflow for GitHub Pages deploy. Archived the vanilla-JS mock to `legacy/`.

---

## Phase 1 — Security: get secrets out of the browser ✅ Done

**Problem (was).** The app stored the Anthropic API key and Meta page token in
`localStorage` and called Anthropic directly from the browser using the
`anthropic-dangerous-direct-browser-access` header.

**What was built:**

- `api/anthropic.js` — Vercel serverless function that holds `ANTHROPIC_API_KEY` as a
  server env var and proxies all Anthropic API calls. The browser never sees the key.
- `api/meta.js` — Vercel serverless function that holds `META_PAGE_TOKEN` and `IMGBB_KEY`
  as server env vars and handles all Meta Graph API operations: Facebook scheduling,
  Instagram scheduling, ad campaign creation, and connection testing.
- `vercel.json` — Vercel deployment config. Sets `VITE_USE_PROXY=true` and `BASE_PATH=/`
  at build time, enabling the proxy path and correct SPA routing.
- Client toggle: `VITE_USE_PROXY` build flag. When `true` (Vercel), all AI and Meta calls
  route through `/api/*` and the Settings tab hides secret fields. When `false` (GitHub
  Pages / local dev), the app falls back to direct API calls with keys stored locally.

**To deploy to Vercel:**
1. Connect the repo in vercel.com → import project.
2. Add three environment variables in Project → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `META_PAGE_TOKEN` — long-lived Meta page token with `pages_manage_posts`,
     `ads_management`, `instagram_content_publish`
   - `IMGBB_KEY` — free key from imgbb.com
3. Deploy. The Settings tab will show "Secure mode" and only ask for Page ID,
   Instagram User ID, and Ad Account ID.

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
