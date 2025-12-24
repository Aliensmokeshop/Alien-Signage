const qs = new URLSearchParams(location.search);
const store = (qs.get("store") || "naco").toLowerCase();

const bannerEl = document.getElementById("banner");
const stageEl = document.getElementById("stage");

let playlist = [];
let idx = 0;

async function loadConfig() {
  const res = await fetch(`playlist.json?v=${Date.now()}`, { cache: "no-store" });
  const cfg = await res.json();

  const s = cfg.stores?.[store];
  bannerEl.textContent = s?.bannerText || `Welcome to Alien Smoke & Vape — ${store}`;

  playlist = cfg.global || [];

  // periodic reload so every screen picks up updates fast
  const refreshMs = (cfg.refreshSeconds || 180) * 1000;
  setTimeout(() => location.reload(), refreshMs);
}

function showItem(item) {
  stageEl.innerHTML = "";

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = `${item.src}?v=${Date.now()}`;
    stageEl.appendChild(img);
    setTimeout(loop, (item.duration || 10) * 1000);
    return;
  }

  if (item.type === "video") {
    const vid = document.createElement("video");
    vid.src = `${item.src}?v=${Date.now()}`;
    vid.autoplay = true;
    vid.muted = true;       // keeps autoplay working
    vid.playsInline = true;
    vid.preload = "auto";
    stageEl.appendChild(vid);

    // If duration is set, use it; else play to the end
    if (item.duration) setTimeout(loop, item.duration * 1000);
    else vid.addEventListener("ended", loop, { once: true });
  }
}

function loop() {
  if (!playlist.length) return;
  const item = playlist[idx % playlist.length];
  idx++;
  showItem(item);
}

(async () => {
  await loadConfig();
  loop();
})();
