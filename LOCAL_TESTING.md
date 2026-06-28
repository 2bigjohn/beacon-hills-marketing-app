# Testing the app locally with your own key

This runs the app in **dev mode** (no serverless proxy). In this mode the app calls the
Anthropic API directly from your browser using the key you enter in the Settings tab —
the same `anthropic-dangerous-direct-browser-access` fallback the proxy replaces in
production. It's perfect for a quick personal test; just don't deploy this mode publicly.

## 1. Get the code on your own machine

```bash
git clone https://github.com/2bigjohn/beacon-hills-marketing-app.git
cd beacon-hills-marketing-app
git checkout claude/beacon-hill-marketing-app-djqfji
npm install
```

## 2. Start the dev server

```bash
npm run dev
```

Open the URL it prints: **http://localhost:5173/beacon-hills-marketing-app/**

## 3. Add your Anthropic API key

1. Tap the **⚙️ Setup** tab at the bottom.
2. Paste your key into **Anthropic API Key** (get one at
   [console.anthropic.com](https://console.anthropic.com) → API Keys → it starts `sk-ant-`).
3. Tap **Save Settings**. The key is stored only in your browser's `localStorage`.

## 4. Test an AI feature (no Meta account needed)

The fastest end-to-end check that doesn't require any Meta setup:

- **Captions:** Tap **📷 Post** → Choose from Gallery → pick any food photo →
  select a tone/goal → **Generate Content**. You should get real AI captions + hashtags
  for Instagram and Facebook within a few seconds.
- **Campaign Ideas:** Tap **💡 Ideas**. This runs a live web search + AI strategy call and
  returns 5 timely campaign ideas. (Uses more tokens — it's the heaviest call.)
- **Event flyer:** Tap **📷 Post** → Upload Event Flyer → pick any event flyer image →
  it extracts the details and builds a 4-phase campaign.

If captions come back, the AI integration is confirmed working.

## 5. (Optional) Test Meta scheduling / ads

These need a real Meta Business setup. In the **⚙️ Setup** tab tap
**📖 How to get your Meta credentials** and follow the steps, then use **Test Connection**
to confirm the token reaches your Page. After that, **📅 Schedule** on a caption and the
**📣 Ad Campaign** builder become active (ads are always created **PAUSED** — nothing goes
live or spends money without you publishing it in Meta Ads Manager).

## What "dev mode" vs "secure mode" means

| | Dev mode (this guide) | Secure mode (Vercel) |
|---|---|---|
| Trigger | `npm run dev` (default) | `VITE_USE_PROXY=true` build, set in `vercel.json` |
| Anthropic key | Entered in Settings, in your browser | Server env var `ANTHROPIC_API_KEY` |
| Meta token | Entered in Settings, in your browser | Server env var `META_PAGE_TOKEN` |
| Safe to deploy publicly? | ❌ No — keys live in the browser | ✅ Yes — browser never sees keys |

Use dev mode only for your own local testing. For a public/shared link, deploy to Vercel
per the Phase 1 instructions in [`ROADMAP.md`](./ROADMAP.md).
