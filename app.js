const qs = new URLSearchParams(location.search);
const store = (qs.get("store") || "naco").toLowerCase();

const bannerEl = document.getElementById("banner");
const stageEl  = document.getElementById("stage");

let playlist = [];
let idx = 0;

async function loadConfig() {
  const res = await fetch(`playlist.json?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load playlist.json (${res.status})`);

  const cfg = await res.json();

  const s = cfg.stores?.[store];
  bannerEl.textContent = s?.bannerText || `Welcome to Alien Smoke & Vape — ${store}`;

  playlist = Array.isArray(cfg.global) ? cfg.global : [];

  // periodic reload so every screen picks up updates fast
  const refreshMs = (cfg.refreshSeconds || 180) * 1000;
  setTimeout(() => location.reload(), refreshMs);
}

function loop() {
  if (!playlist.length) {
    stageEl.innerHTML = `<div style="color:#fff;font-size:24px;font-family:Arial;padding:24px">
      No playlist items found.
    </div>`;
    return;
  }

  const item = playlist[idx % playlist.length];
  idx++;
  showItem(item);
}

function showItem(item) {
  stageEl.innerHTML = "";

  // If something fails, show an error briefly and move on
  const skipSoon = (why) => {
    stageEl.innerHTML = `<div style="color:#ff6b6b;font:600 22px system-ui;padding:24px">
      Media error: ${why}<br><small>${item?.src || ""}</small>
    </div>`;
    setTimeout(loop, 1000);
  };

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = `${item.src}?v=${Date.now()}`;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.onerror = () => skipSoon("image failed to load");
    stageEl.appendChild(img);

    setTimeout(loop, (item.duration || 10) * 1000);
    return;
  }

  if (item.type === "video") {
    const vid = document.createElement("video");
    vid.src = `${item.src}?v=${Date.now()}`;
    vid.autoplay = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "auto";
    vid.style.width = "100%";
    vid.style.height = "100%";
    vid.style.objectFit = "cover";

    vid.onerror = () => skipSoon("video failed to load");
    vid.addEventListener("stalled", () => skipSoon("video stalled"), { once: true });

    stageEl.appendChild(vid);

    // Try to start playback; if blocked, skip
    vid.play().catch(() => skipSoon("video autoplay blocked"));

    if (item.duration) setTimeout(loop, item.duration * 1000);
    else vid.addEventListener("ended", loop, { once: true });

    // Absolute fallback so it never sticks forever
    setTimeout(loop, 60 * 1000);
    return;
  }

  // Unknown type -> skip
  loop();
}

// START
loadConfig()
  .then(loop)
  .catch((err) => {
    stageEl.innerHTML = `<div style="color:#ff6b6b;font-size:18px;font-family:Arial;padding:24px">
      Error: ${err.message}
    </div>`;
    console.error(err);
  });