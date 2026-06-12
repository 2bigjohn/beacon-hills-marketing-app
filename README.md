# Beacon Hills Marketing Studio — Browser/PWA MVP

This is a static browser prototype for testing on Google Chrome on a Samsung/Android phone.

## What works now

- Create a Beacon Hills marketing post from a phone photo or gallery image
- Select tone and campaign goal
- Generate a branded caption, hashtags, organic schedule, audience, and ad recommendation
- Upload an event flyer image and generate an event campaign plan
- Manual approval gates before mock schedule/publish
- Local post history
- Mock analytics dashboard
- Mock Meta connection setting
- PWA manifest and service worker for install/offline behavior after HTTPS deployment

## What is mocked

- Meta Business Suite / Graph API connection
- AI captioning/OCR
- Actual scheduling/publishing
- Actual ad creation/spend
- Actual analytics

## Easiest phone test

1. Unzip this folder.
2. Deploy the folder to a static host such as Netlify, Vercel, Cloudflare Pages, GitHub Pages, or your own HTTPS hosting.
3. Open the deployed URL in Google Chrome on your Samsung phone.
4. Use the Create and Event Flyer tabs.
5. Chrome may offer "Install app" or "Add to Home screen" once the site is served over HTTPS.

## Local desktop test

From inside this folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Camera/PWA install features work best on HTTPS, so use a real static deployment for phone testing.

## Next engineering phase

Replace mocked services with a backend:

- Authentication and user roles
- Meta OAuth
- Secure token storage
- Meta Page/Instagram publishing
- Meta Marketing API campaign drafts
- Real image/flyer OCR
- Real analytics ingestion
- Production database
