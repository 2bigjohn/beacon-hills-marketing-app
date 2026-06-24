export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const GRAPH = "https://graph.facebook.com/v19.0";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const pageToken = process.env.META_PAGE_TOKEN;
  if (!pageToken) {
    return res.status(503).json({
      error:
        "META_PAGE_TOKEN is not set. Add it in your Vercel project → Settings → Environment Variables.",
    });
  }

  const { operation, ...params } = req.body;

  try {
    switch (operation) {
      case "test_connection": {
        const { pageId } = params;
        const r = await fetch(
          `${GRAPH}/${pageId}?fields=name,fan_count&access_token=${pageToken}`
        );
        return res.status(r.status).json(await r.json());
      }

      case "schedule_facebook": {
        const { pageId, caption, hashtags, base64, mime, scheduledTime } = params;
        const message = `${caption}\n\n${(hashtags || []).join(" ")}`.trim();
        const buffer = Buffer.from(base64, "base64");
        const blob = new Blob([buffer], { type: mime || "image/jpeg" });
        const form = new FormData();
        form.append("access_token", pageToken);
        form.append("published", "false");
        form.append("message", message);
        form.append("scheduled_publish_time", String(scheduledTime));
        form.append("source", blob, "photo.jpg");
        const r = await fetch(`${GRAPH}/${pageId}/photos`, {
          method: "POST",
          body: form,
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error.message);
        return res.json(d);
      }

      case "schedule_instagram": {
        const { igUserId, caption, hashtags, base64, scheduledTime } = params;
        const fullCaption = `${caption}\n\n${(hashtags || []).join(" ")}`.trim();

        const imgbbKey = process.env.IMGBB_KEY;
        if (!imgbbKey) throw new Error("IMGBB_KEY is not set on the server.");

        const imgForm = new FormData();
        imgForm.append("key", imgbbKey);
        imgForm.append("image", base64);
        const imgR = await fetch("https://api.imgbb.com/1/upload", {
          method: "POST",
          body: imgForm,
        });
        const imgD = await imgR.json();
        if (!imgD.success)
          throw new Error(imgD.error?.message || "imgBB upload failed");

        const containerR = await fetch(`${GRAPH}/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imgD.data.url,
            caption: fullCaption,
            published: false,
            scheduled_publish_time: scheduledTime,
            access_token: pageToken,
          }),
        });
        const container = await containerR.json();
        if (container.error) throw new Error(container.error.message);

        const pubR = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: pageToken,
          }),
        });
        const pub = await pubR.json();
        if (pub.error) throw new Error(pub.error.message);
        return res.json(pub);
      }

      case "create_campaign": {
        const {
          adAccountId,
          pageId,
          headline,
          primaryText,
          ctaType,
          base64,
          mime,
          dailyBudget,
          objective,
        } = params;

        // 1 — Upload image
        const buffer = Buffer.from(base64, "base64");
        const blob = new Blob([buffer], { type: mime || "image/jpeg" });
        const imgForm = new FormData();
        imgForm.append("access_token", pageToken);
        imgForm.append("filename", blob, "ad.jpg");
        const imgR = await fetch(`${GRAPH}/act_${adAccountId}/adimages`, {
          method: "POST",
          body: imgForm,
        });
        const imgD = await imgR.json();
        if (imgD.error) throw new Error(`Image upload: ${imgD.error.message}`);
        const imageHash = Object.values(imgD.images || {})[0]?.hash;
        if (!imageHash) throw new Error("Image upload failed — no hash returned");

        // 2 — Campaign
        const campR = await fetch(`${GRAPH}/act_${adAccountId}/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Beacon Hills · ${headline} · ${new Date().toLocaleDateString()}`,
            objective,
            status: "PAUSED",
            special_ad_categories: [],
            access_token: pageToken,
          }),
        });
        const camp = await campR.json();
        if (camp.error) throw new Error(`Campaign: ${camp.error.message}`);

        // 3 — Ad Set (Omaha geo targeting)
        const targeting = {
          geo_locations: {
            custom_locations: [
              {
                latitude: 41.2565,
                longitude: -95.9345,
                radius: 20,
                distance_unit: "mile",
                address_string: "Omaha, Nebraska",
              },
            ],
          },
          age_min: 25,
          age_max: 65,
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed", "story"],
          instagram_positions: ["stream", "story"],
        };
        const adSetR = await fetch(`${GRAPH}/act_${adAccountId}/adsets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Beacon Hills – Omaha Fine Dining",
            campaign_id: camp.id,
            daily_budget: dailyBudget * 100,
            billing_event: "IMPRESSIONS",
            optimization_goal:
              objective === "OUTCOME_TRAFFIC" ? "LINK_CLICKS" : "REACH",
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting,
            status: "PAUSED",
            access_token: pageToken,
          }),
        });
        const adSet = await adSetR.json();
        if (adSet.error) throw new Error(`Ad Set: ${adSet.error.message}`);

        // 4 — Creative
        const creativeR = await fetch(
          `${GRAPH}/act_${adAccountId}/adcreatives`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "BH Creative",
              object_story_spec: {
                page_id: pageId,
                link_data: {
                  message: primaryText,
                  link: "https://www.beaconhills.com",
                  image_hash: imageHash,
                  name: headline,
                  call_to_action: {
                    type: ctaType,
                    value: { link: "https://www.beaconhills.com" },
                  },
                },
              },
              access_token: pageToken,
            }),
          }
        );
        const creative = await creativeR.json();
        if (creative.error) throw new Error(`Creative: ${creative.error.message}`);

        // 5 — Ad
        const adR = await fetch(`${GRAPH}/act_${adAccountId}/ads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Beacon Hills Ad",
            adset_id: adSet.id,
            creative: { creative_id: creative.id },
            status: "PAUSED",
            access_token: pageToken,
          }),
        });
        const ad = await adR.json();
        if (ad.error) throw new Error(`Ad: ${ad.error.message}`);

        return res.json({ campaignId: camp.id, adSetId: adSet.id, adId: ad.id });
      }

      default:
        return res.status(400).json({ error: `Unknown operation: ${operation}` });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
