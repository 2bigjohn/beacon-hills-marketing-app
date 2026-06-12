const STORAGE_KEY = "beaconHillsMarketing.v1";
const SETTINGS_KEY = "beaconHillsMarketing.settings.v1";

const $ = (id) => document.getElementById(id);

const state = {
  selectedMedia: null,
  selectedMediaName: "",
  selectedFlyer: null,
  selectedFlyerName: "",
  generated: null,
  eventPlan: null,
  installPrompt: null,
};

const defaultSettings = {
  metaConnected: false,
  reservationLink: "https://beaconhills.com/",
  brandNotes:
    "Warm, polished American bistro voice. Emphasize Aksarben Village, chef-driven food, steaks, chops, seafood, brunch, happy hour, catering, private events, Elmwood Room, hospitality, and reservations. Avoid sounding generic, gimmicky, or overly trendy.",
  preferredHashtags:
    "#BeaconHills #AksarbenVillage #OmahaEats #OmahaRestaurants #AmericanBistro",
};

function getSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return defaultSettings;
  }
}

function saveSettingsObject(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getPosts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.setTimeout(() => toast.classList.add("hidden"), 2600);
}

function setActiveView(viewId) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewId);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  if (viewId === "history") renderHistory();
  if (viewId === "analytics") renderAnalytics();
}

function readFileAsDataUrl(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.onerror = () => showToast("Could not read that file.");
  reader.readAsDataURL(file);
}

function handleMediaFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please select an image for this prototype.");
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    state.selectedMedia = dataUrl;
    state.selectedMediaName = file.name || "Uploaded image";
    $("previewImage").src = dataUrl;
    $("mediaPreview").classList.remove("hidden");
    showToast("Image added.");
  });
}

function handleFlyerFile(file) {
  if (!file) return;
  state.selectedFlyerName = file.name || "Uploaded flyer";
  if (file.type.startsWith("image/")) {
    readFileAsDataUrl(file, (dataUrl) => {
      state.selectedFlyer = dataUrl;
      $("flyerImage").src = dataUrl;
      $("flyerPreview").classList.remove("hidden");
      showToast("Flyer image added.");
    });
  } else {
    state.selectedFlyer = null;
    $("flyerPreview").classList.add("hidden");
    showToast("PDF received. OCR/PDF parsing is a backend feature in the next phase.");
  }
}

function selectedPlatforms() {
  return Array.from(document.querySelectorAll(".platform:checked")).map((el) => el.value);
}

const goalCopy = {
  reservations: {
    cta: "Reserve your table",
    angle: "make Beacon Hills part of your next lunch, dinner, or date night in Aksarben Village",
    organic: "Post today during late morning or mid-afternoon, then repost a Story reminder near 4 PM.",
    ad: "Recommend a light reservation-focused ad if you need more covers this week.",
    audience: "Adults within 8–12 miles of Aksarben Village; interests: dining out, steak, seafood, date night, Omaha restaurants.",
  },
  brunch: {
    cta: "Join us for brunch",
    angle: "bring weekend brunch energy to Beacon Hills",
    organic: "Post Thursday evening, Friday lunch, and Saturday morning for best recall.",
    ad: "Use organic first. Add a small weekend ad if brunch reservations are soft.",
    audience: "Adults within 8–10 miles of Aksarben; interests: brunch, cocktails, local restaurants.",
  },
  happy_hour: {
    cta: "Stop in for happy hour",
    angle: "invite nearby guests to unwind at Beacon Hills",
    organic: "Post same-day around lunch, then add a Story reminder 1–2 hours before happy hour.",
    ad: "Usually organic is enough unless you are promoting a new menu or slow day.",
    audience: "Nearby Aksarben, UNO, and Omaha professionals within 3–6 miles.",
  },
  dinner: {
    cta: "Book dinner",
    angle: "spotlight chef-driven steaks, chops, seafood, and hospitality",
    organic: "Post between 10 AM–2 PM or 3–5 PM for dinner intent.",
    ad: "Recommend a short conversion-oriented ad if the feature is premium, seasonal, or weekend-driven.",
    audience: "Adults within 8–12 miles interested in upscale dining, steakhouse, seafood, and Omaha date night.",
  },
  event: {
    cta: "Save your spot",
    angle: "turn attention into attendance with clear event details",
    organic: "Post announcement, one-week reminder, 48-hour reminder, and day-of Story.",
    ad: "Recommend paid support if the event is ticketed, limited-seat, or needs attendance beyond regular followers.",
    audience: "Adults within 10–15 miles of Aksarben; layer food, wine, live music, private dining, or event interests based on flyer.",
  },
  private_events: {
    cta: "Plan your private event",
    angle: "showcase Beacon Hills and The Elmwood Room for celebrations and business gatherings",
    organic: "Post early week when planners are researching venues; repeat monthly.",
    ad: "Recommend a lead-focused campaign for holiday, graduation, corporate, and wedding-season pushes.",
    audience: "Adults 28+ within Omaha; interests: event planning, corporate events, weddings, celebrations, catering.",
  },
  catering: {
    cta: "Book catering",
    angle: "position Beacon Hills as a polished catering choice for meetings and celebrations",
    organic: "Post Tuesday or Wednesday morning when office/event planning is active.",
    ad: "Recommend a lead or traffic campaign during holiday, graduation, and corporate planning windows.",
    audience: "Omaha office managers, HR, executive assistants, event planners, and adults interested in catering.",
  },
  online_orders: {
    cta: "Order online",
    angle: "make Beacon Hills easy to enjoy at home or the office",
    organic: "Post before lunch or late afternoon for meal-decision timing.",
    ad: "Use organic first; test small traffic ads for limited-time takeout offers.",
    audience: "Adults within 5–8 miles; interests: takeout, lunch, dinner, local restaurants.",
  },
  awareness: {
    cta: "Visit Beacon Hills",
    angle: "keep Beacon Hills top-of-mind as a warm, polished Aksarben dining destination",
    organic: "Post when the image is strongest; add Story version the same day.",
    ad: "No paid spend needed unless launching a larger brand or seasonal campaign.",
    audience: "Omaha diners, Aksarben residents, nearby professionals, and repeat guests.",
  },
};

function toneIntro(tone) {
  const map = {
    "Warm & Hospitable": "There’s always a seat waiting for you at Beacon Hills.",
    "Polished Bistro": "A refined Aksarben dining moment starts here.",
    "Casual Local Favorite": "Good food, good company, and a familiar Aksarben welcome.",
    "Event Promo": "Mark your calendar and make plans with us at Beacon Hills.",
    "Urgent / Limited-Time": "This is your sign to make plans before the opportunity passes.",
    "Elegant Private Dining": "For gatherings that deserve a polished setting and warm hospitality.",
    "Catering / Corporate": "Bring Beacon Hills hospitality to your next meeting or celebration.",
  };
  return map[tone] || map["Warm & Hospitable"];
}

function buildCaption({ tone, goal, details, title, eventName, eventDate }) {
  const settings = getSettings();
  const goalData = goalCopy[goal] || goalCopy.awareness;
  const detailLine = details ? `\n\n${details.trim()}` : "";
  const titleLine = title ? `${title.trim()}\n\n` : "";
  let eventLine = "";
  if (eventName || eventDate) {
    const readableDate = eventDate ? new Date(eventDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
    eventLine = `\n\nEvent: ${eventName || "Beacon Hills event"}${readableDate ? ` · ${readableDate}` : ""}`;
  }
  return `${titleLine}${toneIntro(tone)} ${goalData.angle}. Whether you are joining us for chef-driven American bistro favorites, steaks, chops, seafood, brunch, happy hour, or a special night out, we would love to welcome you in Aksarben Village.${eventLine}${detailLine}\n\n${goalData.cta}: ${settings.reservationLink}`;
}

function buildHashtags(goal) {
  const settings = getSettings();
  const extras = {
    reservations: "#DateNightOmaha #OmahaDining",
    brunch: "#OmahaBrunch #WeekendBrunch",
    happy_hour: "#HappyHourOmaha #Aksarben",
    dinner: "#DinnerInOmaha #SteakAndSeafood",
    event: "#OmahaEvents #AksarbenEvents",
    private_events: "#PrivateDining #OmahaEvents",
    catering: "#OmahaCatering #CorporateCatering",
    online_orders: "#OmahaTakeout #OrderOnline",
    awareness: "#LocalOmaha #OmahaFood",
  };
  return `${settings.preferredHashtags} ${extras[goal] || ""}`.trim();
}

function generatePostPlan() {
  const title = $("postTitle").value;
  const tone = $("tone").value;
  const goal = $("goal").value;
  const details = $("postDetails").value;
  const platforms = selectedPlatforms();

  if (!platforms.length) {
    showToast("Choose at least one platform.");
    return;
  }

  const goalData = goalCopy[goal] || goalCopy.awareness;
  const caption = buildCaption({ tone, goal, details, title });
  const hashtags = buildHashtags(goal);

  state.generated = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    kind: "post",
    title: title || state.selectedMediaName || "Beacon Hills post",
    tone,
    goal,
    platforms,
    details,
    image: state.selectedMedia,
    mediaName: state.selectedMediaName,
    caption,
    hashtags,
    organicSchedule: goalData.organic,
    adRecommendation: goalData.ad,
    audience: goalData.audience,
    createdAt: new Date().toISOString(),
  };

  $("captionOutput").value = caption;
  $("hashtagsOutput").value = hashtags;
  $("scheduleOutput").textContent = goalData.organic;
  $("adOutput").textContent = goalData.ad;
  $("audienceOutput").textContent = goalData.audience;
  $("approvalCheck").checked = false;
  $("generatedCard").classList.remove("hidden");
  $("generatedCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function createMetrics(status, goal) {
  if (status !== "Published" && status !== "Scheduled") {
    return { impressions: 0, reach: 0, engagement: 0, clicks: 0, spend: 0 };
  }
  const base = goal === "event" ? 1300 : goal === "reservations" ? 950 : goal === "happy_hour" ? 780 : 650;
  const multiplier = status === "Scheduled" ? 0 : 1;
  const impressions = Math.round((base + Math.random() * 900) * multiplier);
  const reach = Math.round(impressions * (0.62 + Math.random() * 0.18));
  const engagement = Math.round(impressions * (0.035 + Math.random() * 0.055));
  const clicks = Math.round(impressions * (0.008 + Math.random() * 0.025));
  const spend = goal === "event" || goal === "private_events" || goal === "catering" ? Math.round(25 + Math.random() * 75) : 0;
  return { impressions, reach, engagement, clicks, spend };
}

function saveGenerated(status) {
  if (!state.generated) {
    showToast("Generate a post first.");
    return;
  }

  if ((status === "Scheduled" || status === "Published") && !$("approvalCheck").checked) {
    showToast("Approval is required first.");
    return;
  }

  const post = {
    ...state.generated,
    caption: $("captionOutput").value,
    hashtags: $("hashtagsOutput").value,
    status,
    savedAt: new Date().toISOString(),
    metrics: createMetrics(status, state.generated.goal),
  };

  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  showToast(`${status} saved to history.`);
  renderHistory();
  renderAnalytics();
}

function eventLeadTimeDays(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const date = new Date(dateString);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function paidRecommendationForEvent(days, urgency, eventGoal) {
  if (eventGoal === "awareness") {
    return "Use organic posting first. Paid support is optional unless attendance or reservations are a measurable goal.";
  }
  if (urgency === "limited") {
    return "Recommend organic posts plus a short paid campaign because limited seats need urgency and repeated reach.";
  }
  if (days === null) {
    return "Recommend deciding after event date is confirmed. Paid support is useful for ticketed or reservation-based events.";
  }
  if (days <= 3) {
    return "Recommend same-day/short-burst paid support only if there is budget and the event still needs seats filled.";
  }
  if (days <= 10) {
    return "Recommend organic reminders plus a modest 5–7 day paid campaign.";
  }
  return "Start organic now. Add paid support 10–14 days before the event if reservations or RSVPs are behind goal.";
}

function eventScheduleRecommendation(days) {
  if (days === null) {
    return "Announcement post now, reminder once event date is confirmed, final reminder the day before.";
  }
  if (days <= 2) {
    return "Post immediately, add Story today, and publish a final reminder the morning of the event.";
  }
  if (days <= 10) {
    return "Post announcement today, reminder 3–4 days before, 48-hour reminder, and day-of Story.";
  }
  return "Post announcement now, weekly reminder, one-week reminder, 48-hour reminder, and day-of Story.";
}

function generateEventPlan() {
  const eventName = $("eventName").value.trim() || "Beacon Hills event";
  const eventDate = $("eventDate").value;
  const details = $("flyerText").value.trim();
  const eventGoal = $("eventGoal").value;
  const urgency = $("eventUrgency").value;
  const days = eventLeadTimeDays(eventDate);
  const tone = urgency === "limited" ? "Urgent / Limited-Time" : "Event Promo";
  const caption = buildCaption({
    tone,
    goal: eventGoal,
    details,
    title: eventName,
    eventName,
    eventDate,
  });

  const cadence = eventScheduleRecommendation(days);
  const paid = paidRecommendationForEvent(days, urgency, eventGoal);
  const targeting =
    "Target adults within 10–15 miles of Aksarben Village. Start broad with Omaha diners, then refine around wine, brunch, live music, special events, private dining, catering, or date-night interests based on the flyer.";

  state.eventPlan = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    kind: "event",
    title: eventName,
    tone,
    goal: eventGoal,
    platforms: ["Facebook", "Instagram"],
    details,
    image: state.selectedFlyer,
    mediaName: state.selectedFlyerName,
    caption,
    hashtags: buildHashtags("event"),
    organicSchedule: cadence,
    adRecommendation: paid,
    audience: targeting,
    eventDate,
    createdAt: new Date().toISOString(),
  };

  $("eventCaption").value = caption;
  $("eventSchedule").textContent = cadence;
  $("eventPaid").textContent = paid;
  $("eventTargeting").textContent = targeting;
  $("eventApproval").checked = false;
  $("eventPlanCard").classList.remove("hidden");
  $("eventPlanCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveEvent(status) {
  if (!state.eventPlan) {
    showToast("Generate an event campaign first.");
    return;
  }
  if (status === "Scheduled" && !$("eventApproval").checked) {
    showToast("Approval is required first.");
    return;
  }

  const post = {
    ...state.eventPlan,
    caption: $("eventCaption").value,
    status,
    savedAt: new Date().toISOString(),
    metrics: createMetrics(status, "event"),
  };
  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  showToast(`${status} event campaign saved.`);
  renderHistory();
  renderAnalytics();
}

function statusBadge(status) {
  return `<span class="badge">${status}</span>`;
}

function renderHistory() {
  const search = ($("historySearch")?.value || "").toLowerCase();
  const status = $("historyStatus")?.value || "";
  const container = $("historyList");
  if (!container) return;

  const posts = getPosts().filter((post) => {
    const haystack = `${post.title} ${post.caption} ${post.goal} ${post.tone} ${post.status}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = !status || post.status === status;
    return matchesSearch && matchesStatus;
  });

  if (!posts.length) {
    container.innerHTML = `<p class="meta-line">No posts yet. Generate and save one from Create or Event Flyer.</p>`;
    return;
  }

  container.innerHTML = posts
    .map((post) => {
      const img = post.image
        ? `<img class="history-thumb" src="${post.image}" alt="">`
        : `<div class="history-thumb">${post.kind === "event" ? "🎟️" : "🍽️"}</div>`;
      const date = new Date(post.savedAt || post.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      const metrics = post.metrics || {};
      return `
        <article class="history-item">
          ${img}
          <div>
            <h3>${escapeHtml(post.title || "Beacon Hills post")}</h3>
            <p class="meta-line">${date} · ${escapeHtml(post.tone || "")} · ${escapeHtml((post.platforms || []).join(", "))}</p>
            <p>${escapeHtml((post.caption || "").slice(0, 170))}${(post.caption || "").length > 170 ? "…" : ""}</p>
            <div class="badges">
              ${statusBadge(post.status || "Draft")}
              <span class="badge">${escapeHtml(labelForGoal(post.goal))}</span>
              <span class="badge">${metrics.impressions || 0} impressions</span>
              <span class="badge">${metrics.engagement || 0} engagements</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function labelForGoal(goal) {
  const labels = {
    reservations: "Reservations",
    brunch: "Brunch",
    happy_hour: "Happy Hour",
    dinner: "Dinner",
    event: "Event",
    private_events: "Private Events",
    catering: "Catering",
    online_orders: "Online Orders",
    awareness: "Awareness",
  };
  return labels[goal] || "Marketing";
}

function renderAnalytics() {
  const posts = getPosts();
  const metrics = posts.reduce(
    (acc, post) => {
      const m = post.metrics || {};
      acc.posts += 1;
      acc.impressions += m.impressions || 0;
      acc.reach += m.reach || 0;
      acc.engagement += m.engagement || 0;
      acc.clicks += m.clicks || 0;
      acc.spend += m.spend || 0;
      return acc;
    },
    { posts: 0, impressions: 0, reach: 0, engagement: 0, clicks: 0, spend: 0 }
  );

  $("analyticsSummary").innerHTML = `
    <div class="stat"><span>Posts</span><strong>${metrics.posts}</strong></div>
    <div class="stat"><span>Impressions</span><strong>${metrics.impressions.toLocaleString()}</strong></div>
    <div class="stat"><span>Engagement</span><strong>${metrics.engagement.toLocaleString()}</strong></div>
    <div class="stat"><span>Mock spend</span><strong>$${metrics.spend.toLocaleString()}</strong></div>
  `;

  const top = [...posts]
    .sort((a, b) => ((b.metrics || {}).engagement || 0) - ((a.metrics || {}).engagement || 0))
    .slice(0, 5);

  $("topPosts").innerHTML = top.length
    ? top
        .map((post) => `
          <article class="history-item">
            ${
              post.image
                ? `<img class="history-thumb" src="${post.image}" alt="">`
                : `<div class="history-thumb">${post.kind === "event" ? "🎟️" : "🍽️"}</div>`
            }
            <div>
              <h3>${escapeHtml(post.title || "Beacon Hills post")}</h3>
              <p class="meta-line">${escapeHtml(labelForGoal(post.goal))} · ${post.metrics?.engagement || 0} engagements · ${post.metrics?.clicks || 0} clicks</p>
              <div class="badges">${statusBadge(post.status || "Draft")}<span class="badge">${post.metrics?.impressions || 0} impressions</span></div>
            </div>
          </article>
        `)
        .join("")
    : `<p class="meta-line">No analytics yet. Publish or schedule a mock post first.</p>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetBuilder() {
  $("postTitle").value = "";
  $("postDetails").value = "";
  $("approvalCheck").checked = false;
  $("generatedCard").classList.add("hidden");
  $("mediaPreview").classList.add("hidden");
  $("cameraInput").value = "";
  $("galleryInput").value = "";
  state.selectedMedia = null;
  state.selectedMediaName = "";
  state.generated = null;
}

function saveSettingsFromForm() {
  const settings = {
    ...getSettings(),
    reservationLink: $("reservationLink").value || defaultSettings.reservationLink,
    brandNotes: $("brandNotes").value || defaultSettings.brandNotes,
    preferredHashtags: $("preferredHashtags").value || defaultSettings.preferredHashtags,
  };
  saveSettingsObject(settings);
  showToast("Settings saved.");
}

function renderSettings() {
  const settings = getSettings();
  $("reservationLink").value = settings.reservationLink;
  $("brandNotes").value = settings.brandNotes;
  $("preferredHashtags").value = settings.preferredHashtags;
  $("metaStatus").textContent = settings.metaConnected
    ? "Mock connected. Real Meta OAuth/API integration comes in the backend phase."
    : "Not connected. Prototype mode only.";
  $("toggleMeta").textContent = settings.metaConnected ? "Mock disconnect" : "Mock connect";
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(getPosts(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beacon-hills-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function init() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveView(tab.dataset.view));
  });

  $("cameraInput").addEventListener("change", (e) => handleMediaFile(e.target.files[0]));
  $("galleryInput").addEventListener("change", (e) => handleMediaFile(e.target.files[0]));
  $("flyerInput").addEventListener("change", (e) => handleFlyerFile(e.target.files[0]));
  $("clearMedia").addEventListener("click", () => {
    state.selectedMedia = null;
    state.selectedMediaName = "";
    $("mediaPreview").classList.add("hidden");
  });

  $("generatePost").addEventListener("click", generatePostPlan);
  $("resetBuilder").addEventListener("click", resetBuilder);
  $("saveDraft").addEventListener("click", () => saveGenerated("Draft"));
  $("scheduleMock").addEventListener("click", () => saveGenerated("Scheduled"));
  $("publishMock").addEventListener("click", () => saveGenerated("Published"));

  $("generateEvent").addEventListener("click", generateEventPlan);
  $("saveEventDraft").addEventListener("click", () => saveEvent("Draft"));
  $("scheduleEventMock").addEventListener("click", () => saveEvent("Scheduled"));

  $("historySearch").addEventListener("input", renderHistory);
  $("historyStatus").addEventListener("change", renderHistory);
  $("exportHistory").addEventListener("click", exportHistory);

  $("saveSettings").addEventListener("click", saveSettingsFromForm);
  $("clearAllData").addEventListener("click", () => {
    if (confirm("Clear all prototype posts and settings from this browser?")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      renderSettings();
      renderHistory();
      renderAnalytics();
      showToast("Prototype data cleared.");
    }
  });
  $("toggleMeta").addEventListener("click", () => {
    const settings = getSettings();
    settings.metaConnected = !settings.metaConnected;
    saveSettingsObject(settings);
    renderSettings();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    $("installBtn").classList.remove("hidden");
  });

  $("installBtn").addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    $("installBtn").classList.add("hidden");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // App still works without offline cache.
      });
    });
  }

  renderSettings();
  renderHistory();
  renderAnalytics();
}

document.addEventListener("DOMContentLoaded", init);
