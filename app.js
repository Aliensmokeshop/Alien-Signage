const qs = new URLSearchParams(location.search);
const store = (qs.get("store") || "naco").toLowerCase();

const bannerEl = document.getElementById("banner");
const stageEl  = document.getElementById("stage");

let globalList = [];
let storeList  = [];
let specials   = [];

let idx = 0;
let spIdx = 0;
let normalSinceSpecial = 0;
let specialEvery = 0;

async function loadConfig() {
  const res = await fetch(`playlist.json?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load playlist.json (${res.status})`);

  const cfg = await res.json();
  const s = cfg.stores?.[store];

  bannerEl.textContent = s?.bannerText || `Welcome to Alien Smoke & Vape — ${store}`;

  globalList = Array.isArray(cfg.global) ? cfg.global : [];
  storeList  = Array.isArray(s?.playlist) ? s.playlist : [];
  specials   = Array.isArray(s?.specials) ? s.specials : [];

  specialEvery = Number(s?.specialEvery || 0);

  // optional: hide banner for 2x2 wall
  if (store === "2x2") {
    bannerEl.style.display = "none";
    stageEl.style.height = "100vh";
  }

  const refreshMs = (cfg.refreshSeconds || 180) * 1000;
  setTimeout(() => location.reload(), refreshMs);
}

function getNextItem() {
  if (specialEvery > 0 && specials.length > 0 && normalSinceSpecial >= specialEvery) {
    normalSinceSpecial = 0;
    const item = specials[spIdx % specials.length];
    spIdx++;
    return item;
  }

  const combined = [...storeList, ...globalList];
  if (!combined.length) return null;

  const item = combined[idx % combined.length];
  idx++;
  normalSinceSpecial++;
  return item;
}

function loop() {
  const item = getNextItem();

  if (!item) {
    stageEl.innerHTML = `<div style="color:#fff;font:600 22px system-ui;padding:24px">
      No playlist items for store "<b>${store}</b>".
    </div>`;
    return;
  }

  showItem(item);
}

function showItem(item) {
  stageEl.innerHTML = "";

  const full = (src) => `${src}?v=${Date.now()}`;
  const fit = item.fit || "cover";

  const skipSoon = (why) => {
    stageEl.innerHTML = `<div style="color:#ff6b6b;font:600 20px system-ui;padding:24px">
      Media error: ${why}<br>
      <small style="opacity:.85">${item?.src || ""}</small>
    </div>`;
    setTimeout(loop, 1500);
  };

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = full(item.src);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = fit;
    img.onerror = () => skipSoon("image failed to load");
    stageEl.appendChild(img);

    setTimeout(loop, (item.duration || 10) * 1000);
    return;
  }

  if (item.type === "video") {
    const vid = document.createElement("video");
    vid.src = full(item.src);
    vid.autoplay = true;
    vid.muted = true;                 // required for autoplay
    vid.playsInline = true;
    vid.preload = "auto";
    vid.style.width = "100%";
    vid.style.height = "100%";
    vid.style.objectFit = fit;

    // help some kiosk builds
    vid.setAttribute("muted", "");
    vid.setAttribute("playsinline", "");

    vid.onerror = () => skipSoon("video failed to load");
    vid.addEventListener("stalled", () => skipSoon("video stalled"), { once: true });

    stageEl.appendChild(vid);

    // Only fail if it truly cannot play (this prints the REAL reason)
    vid.play().catch((e) => skipSoon(`play() failed: ${e?.name || "unknown"} ${e?.message || ""}`));

    // If duration is set, use it; otherwise play to end
    if (item.duration) {
      setTimeout(loop, item.duration * 1000);
    } else {
      vid.addEventListener("ended", loop, { once: true });
    }

    // Safety fallback ONLY if the video never starts playing
    let started = false;
    vid.addEventListener("playing", () => { started = true; }, { once: true });
    setTimeout(() => { if (!started) skipSoon("video never started"); }, 8000);

    return;
  }

  skipSoon("unknown media type");
}

// START
loadConfig()
  .then(() => setTimeout(loop, 250))
  .catch((err) => {
    stageEl.innerHTML = `<div style="color:#ff6b6b;font:600 18px system-ui;padding:24px">
      Error: ${err.message}
    </div>`;
    console.error(err);
  });