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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22) {
      // Strip images from oldest posts to reclaim space, then retry
      const trimmed = posts.map((p, i) =>
        i < posts.length - 3 ? { ...p, image: null } : p
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        showToast("Storage nearly full — older post images removed to save space.");
      } catch {
        showToast("Storage full. Clear some posts in History to continue.");
      }
    }
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.setTimeout(() => toast.classList.add("hidden"), 2800);
}

function setActiveView(viewId) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewId);
    tab.setAttribute("aria-selected", String(tab.dataset.view === viewId));
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

function compressImage(dataUrl, maxWidth, quality, callback) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxWidth / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL("image/jpeg", quality));
  };
  img.onerror = () => callback(dataUrl);
  img.src = dataUrl;
}

function handleMediaFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please select an image for this prototype.");
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    compressImage(dataUrl, 1200, 0.78, (compressed) => {
      state.selectedMedia = compressed;
      state.selectedMediaName = file.name || "Uploaded image";
      $("previewImage").src = compressed;
      $("mediaPreview").classList.remove("hidden");
      showToast("Image added.");
    });
  });
}

function handleFlyerFile(file) {
  if (!file) return;
  state.selectedFlyerName = file.name || "Uploaded flyer";
  if (file.type.startsWith("image/")) {
    readFileAsDataUrl(file, (dataUrl) => {
      compressImage(dataUrl, 1200, 0.78, (compressed) => {
        state.selectedFlyer = compressed;
        $("flyerImage").src = compressed;
        $("flyerPreview").classList.remove("hidden");
        showToast("Flyer image added.");
      });
    });
  } else {
    state.selectedFlyer = null;
    $("flyerPreview").classList.add("hidden");
    showToast("PDF received — OCR/parsing is a backend feature in the next phase.");
  }
}

function selectedPlatforms() {
  return Array.from(document.querySelectorAll(".platform:checked")).map((el) => el.value);
}

const goalCopy = {
  reservations: {
    cta: "Reserve your table",
    angle: "make Beacon Hills your next dinner or date night in Aksarben Village",
    organic: "Post late morning or mid-afternoon, then add a Story reminder near 4 PM.",
    ad: "A light reservation-focused ad works well if you need more covers this week.",
    audience: "Adults within 8–12 miles of Aksarben Village; interests: dining out, steak, seafood, date night, Omaha restaurants.",
  },
  brunch: {
    cta: "Join us for brunch",
    angle: "spend a leisurely brunch morning at Beacon Hills",
    organic: "Post Thursday evening, Friday lunch, and Saturday morning for best recall.",
    ad: "Try organic first. Add a small weekend ad if brunch reservations are soft.",
    audience: "Adults within 8–10 miles of Aksarben; interests: brunch, cocktails, local restaurants.",
  },
  happy_hour: {
    cta: "Stop in for happy hour",
    angle: "unwind with us during happy hour at Beacon Hills",
    organic: "Post same-day around lunch, then add a Story reminder 1–2 hours before happy hour.",
    ad: "Organic is usually enough unless you are promoting a new menu or a slow weekday.",
    audience: "Nearby Aksarben, UNO, and Omaha professionals within 3–6 miles.",
  },
  dinner: {
    cta: "Book dinner",
    angle: "enjoy chef-driven steaks, chops, and seafood at Beacon Hills",
    organic: "Post between 10 AM–2 PM or 3–5 PM to catch dinner-intent scrolling.",
    ad: "A short conversion-oriented ad works well for premium, seasonal, or weekend features.",
    audience: "Adults within 8–12 miles interested in upscale dining, steakhouse, seafood, and Omaha date night.",
  },
  event: {
    cta: "Save your spot",
    angle: "join us for a one-of-a-kind evening at Beacon Hills",
    organic: "Post announcement, one-week reminder, 48-hour reminder, and day-of Story.",
    ad: "Paid support is smart for ticketed or limited-seat events that need reach beyond your followers.",
    audience: "Adults within 10–15 miles of Aksarben; layer food, wine, live music, or private dining interests based on the flyer.",
  },
  private_events: {
    cta: "Plan your private event",
    angle: "host your next celebration or gathering in The Elmwood Room at Beacon Hills",
    organic: "Post early in the week when planners are researching venues; repeat monthly.",
    ad: "A lead-focused campaign works well for holiday, graduation, corporate, and wedding-season pushes.",
    audience: "Adults 28+ in Omaha; interests: event planning, corporate events, weddings, celebrations, catering.",
  },
  catering: {
    cta: "Book catering",
    angle: "bring Beacon Hills hospitality to your next meeting or celebration",
    organic: "Post Tuesday or Wednesday morning when office and event planning is active.",
    ad: "A lead or traffic campaign performs well during holiday, graduation, and corporate planning windows.",
    audience: "Omaha office managers, HR, executive assistants, event planners, and adults interested in catering.",
  },
  online_orders: {
    cta: "Order online",
    angle: "enjoy Beacon Hills at home or the office",
    organic: "Post before lunch or late afternoon to hit meal-decision timing.",
    ad: "Test small traffic ads for limited-time takeout offers; organic first otherwise.",
    audience: "Adults within 5–8 miles; interests: takeout, lunch, dinner, local restaurants.",
  },
  awareness: {
    cta: "Visit Beacon Hills",
    angle: "discover why Beacon Hills is Aksarben Village's favorite bistro",
    organic: "Post when the image is strongest; add a Story version the same day.",
    ad: "No paid spend needed unless launching a larger brand or seasonal campaign.",
    audience: "Omaha diners, Aksarben residents, nearby professionals, and repeat guests.",
  },
};

function toneBody(tone, goal, goalData) {
  const bodies = {
    "Warm & Hospitable": `There's always a seat waiting for you. Come ${goalData.angle} — we would love to welcome you.`,
    "Polished Bistro": `Chef-driven American bistro cuisine meets genuine hospitality at Beacon Hills in Aksarben Village. Join us to ${goalData.angle}.`,
    "Casual Local Favorite": `Your neighborhood bistro is ready for you. Swing by Beacon Hills to ${goalData.angle}. Good food, good company — always.`,
    "Event Promo": `Mark your calendar. Beacon Hills in Aksarben Village invites you to ${goalData.angle}. This is one you will not want to miss.`,
    "Urgent / Limited-Time": `This is your reminder: ${goalData.angle} at Beacon Hills before the opportunity passes. Don't wait.`,
    "Elegant Private Dining": `At Beacon Hills in Aksarben Village, every gathering deserves a polished setting and warm hospitality. Let us help you ${goalData.angle}.`,
    "Catering / Corporate": `Bring Beacon Hills hospitality to your next event. We are ready to ${goalData.angle} — professionally and beautifully executed.`,
  };
  return bodies[tone] || bodies["Warm & Hospitable"];
}

function buildCaption({ tone, goal, details, title, eventName, eventDate }) {
  const settings = getSettings();
  const goalData = goalCopy[goal] || goalCopy.awareness;
  const body = toneBody(tone, goal, goalData);
  const header = title ? `${title.trim()}\n\n` : "";
  const detailLine = details ? `\n\n${details.trim()}` : "";
  let eventLine = "";
  if (eventName || eventDate) {
    const readableDate = eventDate
      ? new Date(eventDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
      : "";
    eventLine = `\n\n📅 ${eventName || "Beacon Hills event"}${readableDate ? ` · ${readableDate}` : ""}`;
  }
  return `${header}${body}${eventLine}${detailLine}\n\n${goalData.cta}: ${settings.reservationLink}`;
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

function updateCaptionCount() {
  const el = $("captionCount");
  if (!el) return;
  const len = ($("captionOutput")?.value || "").length;
  el.textContent = `${len.toLocaleString()} / 2,200 chars`;
  el.classList.toggle("over-limit", len > 2200);
}

async function copyToClipboard(targetId, label) {
  const value = $(targetId)?.value || "";
  if (!value) { showToast("Nothing to copy."); return; }
  try {
    await navigator.clipboard.writeText(value);
    showToast(`${label} copied to clipboard.`);
  } catch {
    showToast("Could not copy — select text and copy manually.");
  }
}

function generatePostPlan() {
  const title = $("postTitle").value.trim();
  const tone = $("tone").value;
  const goal = $("goal").value;
  const details = $("postDetails").value.trim();
  const platforms = selectedPlatforms();

  if (!platforms.length) {
    showToast("Choose at least one platform.");
    return;
  }
  if (!title && !details && !state.selectedMedia) {
    showToast("Add a title, some details, or a photo before generating.");
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
  updateCaptionCount();
}

function createMetrics(status, goal) {
  if (status !== "Published" && status !== "Scheduled") {
    return { impressions: 0, reach: 0, engagement: 0, clicks: 0, spend: 0 };
  }
  const base =
    goal === "event" ? 1300 :
    goal === "reservations" ? 950 :
    goal === "happy_hour" ? 780 : 650;
  const multiplier = status === "Scheduled" ? 0 : 1;
  const impressions = Math.round((base + Math.random() * 900) * multiplier);
  const reach = Math.round(impressions * (0.62 + Math.random() * 0.18));
  const engagement = Math.round(impressions * (0.035 + Math.random() * 0.055));
  const clicks = Math.round(impressions * (0.008 + Math.random() * 0.025));
  const spend =
    goal === "event" || goal === "private_events" || goal === "catering"
      ? Math.round(25 + Math.random() * 75)
      : 0;
  return { impressions, reach, engagement, clicks, spend };
}

function saveGenerated(status) {
  if (!state.generated) {
    showToast("Generate a post first.");
    return;
  }
  if ((status === "Scheduled" || status === "Published") && !$("approvalCheck").checked) {
    showToast("Check the approval box first.");
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
  showToast(`${status} — saved to History.`);
  renderHistory();
  renderAnalytics();
}

function eventLeadTimeDays(dateString) {
  if (!dateString) return null;
  const diff = new Date(dateString).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function paidRecommendationForEvent(days, urgency, eventGoal) {
  if (eventGoal === "awareness") {
    return "Use organic posting first. Paid support is optional unless attendance is a measurable goal.";
  }
  if (urgency === "limited") {
    return "Recommend organic posts plus a short paid campaign — limited seats need urgency and repeated reach.";
  }
  if (days === null) {
    return "Confirm the event date first. Paid support is most effective for ticketed or reservation-based events.";
  }
  if (days <= 3) {
    return "Short-burst paid support only if budget allows and the event still needs seats filled.";
  }
  if (days <= 10) {
    return "Organic reminders plus a modest 5–7 day paid campaign.";
  }
  return "Start organic now. Add paid support 10–14 days before the event if reservations are behind goal.";
}

function eventScheduleRecommendation(days) {
  if (days === null) {
    return "Announcement post now, reminder once date is confirmed, final reminder the day before.";
  }
  if (days <= 2) {
    return "Post immediately, add Story today, and publish a final reminder the morning of the event.";
  }
  if (days <= 10) {
    return "Announcement today, reminder 3–4 days before, 48-hour reminder, and day-of Story.";
  }
  return "Announcement now, weekly reminder, one-week reminder, 48-hour reminder, and day-of Story.";
}

function generateEventPlan() {
  const eventName = $("eventName").value.trim();
  const eventDate = $("eventDate").value;
  const details = $("flyerText").value.trim();
  const eventGoal = $("eventGoal").value;
  const urgency = $("eventUrgency").value;

  if (!eventName) {
    showToast("Enter an event name before building the campaign.");
    $("eventName").focus();
    return;
  }

  const days = eventLeadTimeDays(eventDate);
  const tone = urgency === "limited" ? "Urgent / Limited-Time" : "Event Promo";
  const caption = buildCaption({ tone, goal: eventGoal, details, title: eventName, eventName, eventDate });
  const cadence = eventScheduleRecommendation(days);
  const paid = paidRecommendationForEvent(days, urgency, eventGoal);
  const targeting =
    "Target adults within 10–15 miles of Aksarben Village. Start broad with Omaha diners, then refine around wine, brunch, live music, private dining, or event interests based on the flyer.";

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
  if ((status === "Scheduled" || status === "Published") && !$("eventApproval").checked) {
    showToast("Check the approval box first.");
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
  showToast(`${status} event campaign saved to History.`);
  renderHistory();
  renderAnalytics();
}

function deletePost(id) {
  if (!confirm("Remove this post from history?")) return;
  const posts = getPosts().filter((p) => p.id !== id);
  savePosts(posts);
  renderHistory();
  renderAnalytics();
  showToast("Post removed.");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(status) {
  return `<span class="badge">${escapeHtml(status)}</span>`;
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

function renderHistory() {
  const search = ($("historySearch")?.value || "").toLowerCase();
  const status = $("historyStatus")?.value || "";
  const container = $("historyList");
  if (!container) return;

  const posts = getPosts().filter((post) => {
    const haystack = `${post.title} ${post.caption} ${post.goal} ${post.tone} ${post.status}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!status || post.status === status);
  });

  if (!posts.length) {
    container.innerHTML = `<p class="meta-line">No posts yet. Generate and save one from Create or Event Flyer.</p>`;
    return;
  }

  container.innerHTML = posts
    .map((post) => {
      const thumb = post.image
        ? `<img class="history-thumb" src="${escapeHtml(post.image)}" alt="">`
        : `<div class="history-thumb placeholder">${post.kind === "event" ? "🎟️" : "🍽️"}</div>`;
      const date = new Date(post.savedAt || post.createdAt).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const m = post.metrics || {};
      const preview = (post.caption || "").slice(0, 160);
      const truncated = (post.caption || "").length > 160;
      return `
        <article class="history-item" data-id="${escapeHtml(post.id)}">
          ${thumb}
          <div class="history-content">
            <div class="history-header">
              <h3>${escapeHtml(post.title || "Beacon Hills post")}</h3>
              <button class="delete-btn" data-id="${escapeHtml(post.id)}" title="Remove post" type="button">✕</button>
            </div>
            <p class="meta-line">${date} · ${escapeHtml(post.tone || "")} · ${escapeHtml((post.platforms || []).join(", "))}</p>
            <p class="caption-preview">${escapeHtml(preview)}${truncated ? "…" : ""}</p>
            <div class="badges">
              ${statusBadge(post.status || "Draft")}
              <span class="badge">${escapeHtml(labelForGoal(post.goal))}</span>
              ${m.impressions ? `<span class="badge">${m.impressions.toLocaleString()} impressions</span>` : ""}
              ${m.engagement ? `<span class="badge">${m.engagement.toLocaleString()} engagements</span>` : ""}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAnalytics() {
  const posts = getPosts();
  const totals = posts.reduce(
    (acc, post) => {
      const m = post.metrics || {};
      acc.posts += 1;
      acc.impressions += m.impressions || 0;
      acc.engagement += m.engagement || 0;
      acc.spend += m.spend || 0;
      return acc;
    },
    { posts: 0, impressions: 0, engagement: 0, spend: 0 }
  );

  $("analyticsSummary").innerHTML = `
    <div class="stat"><span>Posts</span><strong>${totals.posts}</strong></div>
    <div class="stat"><span>Impressions</span><strong>${totals.impressions.toLocaleString()}</strong></div>
    <div class="stat"><span>Engagement</span><strong>${totals.engagement.toLocaleString()}</strong></div>
    <div class="stat"><span>Mock spend</span><strong>$${totals.spend.toLocaleString()}</strong></div>
  `;

  const top = [...posts]
    .sort((a, b) => ((b.metrics || {}).engagement || 0) - ((a.metrics || {}).engagement || 0))
    .slice(0, 5);

  $("topPosts").innerHTML = top.length
    ? top.map((post) => `
        <article class="history-item compact">
          ${
            post.image
              ? `<img class="history-thumb" src="${escapeHtml(post.image)}" alt="">`
              : `<div class="history-thumb placeholder">${post.kind === "event" ? "🎟️" : "🍽️"}</div>`
          }
          <div>
            <h3>${escapeHtml(post.title || "Beacon Hills post")}</h3>
            <p class="meta-line">${escapeHtml(labelForGoal(post.goal))} · ${(post.metrics?.engagement || 0).toLocaleString()} engagements · ${(post.metrics?.clicks || 0).toLocaleString()} clicks</p>
            <div class="badges">${statusBadge(post.status || "Draft")}<span class="badge">${(post.metrics?.impressions || 0).toLocaleString()} impressions</span></div>
          </div>
        </article>
      `).join("")
    : `<p class="meta-line">No analytics yet. Publish or schedule a mock post first.</p>`;
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
  updateCaptionCount();
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
    $("cameraInput").value = "";
    $("galleryInput").value = "";
  });

  $("generatePost").addEventListener("click", generatePostPlan);
  $("resetBuilder").addEventListener("click", resetBuilder);
  $("saveDraft").addEventListener("click", () => saveGenerated("Draft"));
  $("scheduleMock").addEventListener("click", () => saveGenerated("Scheduled"));
  $("publishMock").addEventListener("click", () => saveGenerated("Published"));

  $("captionOutput").addEventListener("input", updateCaptionCount);
  $("copyCaptionBtn").addEventListener("click", () => copyToClipboard("captionOutput", "Caption"));
  $("copyHashtagsBtn").addEventListener("click", () => copyToClipboard("hashtagsOutput", "Hashtags"));

  $("generateEvent").addEventListener("click", generateEventPlan);
  $("saveEventDraft").addEventListener("click", () => saveEvent("Draft"));
  $("scheduleEventMock").addEventListener("click", () => saveEvent("Scheduled"));
  $("publishEventMock").addEventListener("click", () => saveEvent("Published"));

  $("historySearch").addEventListener("input", renderHistory);
  $("historyStatus").addEventListener("change", renderHistory);
  $("exportHistory").addEventListener("click", exportHistory);

  // Event delegation for delete buttons in history list
  $("historyList").addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (btn) deletePost(btn.dataset.id);
  });

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
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  renderSettings();
  renderHistory();
  renderAnalytics();
  updateCaptionCount();
}

document.addEventListener("DOMContentLoaded", init);
