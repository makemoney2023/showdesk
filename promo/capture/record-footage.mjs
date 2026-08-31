/**
 * Records ShowDesk app footage for the promo/demo videos.
 *
 * Requires the dev server running in DEMO MODE on http://localhost:3000.
 * Seeds a realistic Sieger show roster through the API, then captures five
 * screen segments with Playwright video recording:
 *
 *   roster.webm      — desktop, /admin/entries roster table
 *   ringside.webm    — phone, /ringside → record critique with live transcript
 *   review.webm      — desktop, /admin/review → approve & release
 *   placements.webm  — desktop, /ringside/placements → tap places → save
 *   reports.webm     — desktop, /admin/reports → per-dog documents
 *
 * Live transcription is mocked (Deepgram token + WebSocket) so the promo can
 * show the real UI behaviour without an API key.
 *
 * Usage: node promo/capture/record-footage.mjs
 * Output: promo/public/footage/*.webm
 */
import { chromium } from "@playwright/test";
import { mkdirSync, rmSync, readdirSync, renameSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = "http://localhost:3000";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "../public/footage");
const DATA_DIR = path.resolve(HERE, "../../.data");

const DESKTOP = { width: 1600, height: 1000 };
const PHONE = { width: 430, height: 932 };

const ROSTER_CSV = [
  "armband,dog_name,zb_number,wt,owner,sex,class_id,email",
  "101,Axel vom Nordwald,ZB 134201,2025-06-14,Marcus Weber,R,jugendklasse-i,marcus@example.com",
  "102,Bruno von der Eiche,ZB 134287,2025-07-02,Anna Fischer,R,jugendklasse-i,anna@example.com",
  "103,Kira vom Schwarzen Tal,ZB 134312,2025-05-21,Jonas Braun,H,jugendklasse-i,jonas@example.com",
  "104,Nera von Blacksage,ZB 134388,2025-08-09,Sophie Wagner,H,jugendklasse-i,sophie@example.com",
  "105,Quinn vom Hause Berger,ZB 133910,2024-11-30,Lena Hoffmann,R,zwischenklasse,lena@example.com",
  "106,Rex von der Alten Muehle,ZB 132400,2023-04-18,Max Mustermann,R,offene-klasse,max@example.com",
  "110,Gero vom Adlerhorst,ZB 132511,2023-02-07,Paul Schneider,R,offene-klasse,paul@example.com",
  "107,Bella von Ostsee,ZB 132688,2023-09-03,Jane Example,H,offene-klasse,jane@example.com",
  "108,Django vom Kaiserhof,ZB 131009,2022-01-25,Erik Lang,R,gebrauchshundklasse,erik@example.com",
  "109,Freya vom Donautal,ZB 129771,2020-10-12,Marta Keller,H,championklasse,marta@example.com",
].join("\n");

const CRITIQUES = {
  rex: "Two and a half years, large, powerful male in excellent condition. Correct scissor bite, complete dentition, dark brown eyes. Masculine head with well pronounced stop. Firm straight topline, deep broad chest, correct croup. Very good angulation front and rear. Moves with power and excellent reach. Confident and self-assured. An excellent open class male.",
  bella: "Three years, medium large female of very good type. Scissor bite, dark eyes, correct ear set. Feminine expressive head. Very good topline and underline, well developed forechest. Correct bone strength for a female. Free flowing gait with good drive from behind. Friendly, secure temperament. Very good open class female.",
  kira: "Twelve months, medium strong youth female. Correct bite, medium brown eyes. Feminine head, good stop. Level back, chest still developing as expected for her age. Correct angulation. Moves cleanly coming and going. Open and approachable nature. A very promising youth female.",
};

// Dripped word-by-word through the mocked live STT socket while recording.
const AXEL_LIVE_SENTENCES = [
  "Fourteen months, strong, medium large male with very good bone.",
  "Correct scissor bite, dark eyes, well set ears.",
  "Typical male head with pronounced stop.",
  "Straight topline, deep chest for his age.",
  "Free, ground covering movement with good drive.",
  "Confident, steady temperament. A very promising youth male.",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Fake cursor overlay so the viewer can follow along                  */
/* ------------------------------------------------------------------ */
const CURSOR_INIT = `
(() => {
  if (window.__pwCursorInstalled) return;
  window.__pwCursorInstalled = true;
  // Keep the PWA install prompt out of the footage.
  try { localStorage.setItem("sss-pwa-install-dismissed", String(Date.now())); } catch {}
  const style = document.createElement("style");
  style.textContent = \`
    * { scrollbar-width: none !important; }
    *::-webkit-scrollbar { display: none !important; }
    #__pw-cursor {
      position: fixed; top: 0; left: 0; width: 26px; height: 26px;
      margin: -13px 0 0 -13px; border-radius: 9999px;
      background: rgba(196,163,90,0.35);
      border: 2px solid rgba(196,163,90,0.95);
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      pointer-events: none; z-index: 2147483647;
      transition: transform 90ms ease, background 90ms ease;
      transform: scale(1);
    }
    #__pw-cursor.down { transform: scale(0.62); background: rgba(196,163,90,0.85); }
    nextjs-portal { display: none !important; }
  \`;
  const attach = () => {
    document.head.appendChild(style);
    const dot = document.createElement("div");
    dot.id = "__pw-cursor";
    dot.style.opacity = "0";
    document.body.appendChild(dot);
    window.addEventListener("mousemove", (e) => {
      dot.style.opacity = "1";
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
    }, true);
    window.addEventListener("mousedown", () => dot.classList.add("down"), true);
    window.addEventListener("mouseup", () => dot.classList.remove("down"), true);
  };
  if (document.body) attach();
  else document.addEventListener("DOMContentLoaded", attach);
})();
`;

/* ------------------------------------------------------------------ */
/* Smooth pointer helpers                                              */
/* ------------------------------------------------------------------ */
let mouse = { x: 200, y: 200 };

async function glideTo(page, locator, opts = {}) {
  await locator.waitFor({ state: "visible" });
  // Center the target so clicks never land under fixed navigation bars.
  await locator.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await sleep(320);
  const box = await locator.boundingBox();
  if (!box) throw new Error("No bounding box for locator");
  const tx = box.x + box.width * (opts.xr ?? 0.5);
  const ty = box.y + box.height * (opts.yr ?? 0.5);
  const dist = Math.hypot(tx - mouse.x, ty - mouse.y);
  const steps = Math.max(14, Math.min(42, Math.round(dist / 28)));
  await page.mouse.move(tx, ty, { steps });
  mouse = { x: tx, y: ty };
  await sleep(opts.settle ?? 260);
}

async function glideClick(page, locator, opts = {}) {
  await glideTo(page, locator, opts);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
  await sleep(opts.after ?? 420);
}

async function typeInto(page, locator, text) {
  await glideClick(page, locator, { after: 200 });
  await page.keyboard.type(text, { delay: 70 });
  await sleep(500);
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */
async function seed(browser) {
  // Fresh demo store.
  rmSync(DATA_DIR, { recursive: true, force: true });

  const ctx = await browser.newContext({ baseURL: BASE });
  const api = ctx.request;
  const login = await api.post("/api/auth/login", {
    data: { email: "secretary@demo.local", password: "demo1234" },
  });
  if (!login.ok()) throw new Error(`login failed: ${login.status()}`);

  const showRes = await api.post("/api/shows", {
    data: {
      name: "Blacksage Sieger Show 2026",
      date: "2026-09-19",
      venue: "Blacksage Kennels Grounds",
      judges: ["Hans Richter", "Petra Klein"],
      rulebook: "adrk",
    },
  });
  if (!showRes.ok()) throw new Error(`show create failed: ${showRes.status()}`);
  const { show } = await showRes.json();

  const importRes = await api.post("/api/entries", {
    data: { action: "import_csv", show_id: show.id, csv: ROSTER_CSV },
  });
  if (!importRes.ok()) throw new Error(`csv import failed: ${importRes.status()}`);

  const entriesRes = await api.get(`/api/entries?show_id=${show.id}`);
  const { entries } = await entriesRes.json();
  const byName = (name) => entries.find((e) => e.dog_name === name);

  // Pre-seed critiques so review queue / reports look real on camera.
  async function critique(dogName, transcript, { approve = false, judge = "Hans Richter" } = {}) {
    const entry = byName(dogName);
    const res = await api.post("/api/critiques", {
      data: {
        show_id: show.id,
        entry_id: entry.id,
        audio_base64: Buffer.from("promo-demo-audio").toString("base64"),
        live_transcript: transcript,
        judge,
      },
    });
    if (!res.ok()) throw new Error(`critique for ${dogName} failed: ${res.status()}`);
    const { id } = await res.json();
    if (approve) {
      const patch = await api.patch("/api/critiques", {
        data: { show_id: show.id, critique_id: id, action: "approve" },
      });
      if (!patch.ok()) throw new Error(`approve for ${dogName} failed`);
      await api.post("/api/approve", {
        data: { show_id: show.id, critique_id: id },
      });
    }
    return id;
  }

  await critique("Rex von der Alten Muehle", CRITIQUES.rex, { approve: true });
  await critique("Bella von Ostsee", CRITIQUES.bella, { approve: true, judge: "Petra Klein" });
  await critique("Kira vom Schwarzen Tal", CRITIQUES.kira);

  await ctx.close();
  return { showId: show.id, entries };
}

/* ------------------------------------------------------------------ */
/* Recording contexts                                                  */
/* ------------------------------------------------------------------ */
async function newRecordingPage(browser, { viewport, name, isMobile = false }) {
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport,
    recordVideo: { dir: OUT_DIR, size: viewport },
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: isMobile ? 3 : 2,
    reducedMotion: "no-preference",
    // The app's service worker would bypass page.route/routeWebSocket mocks.
    serviceWorkers: "block",
  });
  await ctx.addInitScript(CURSOR_INIT);
  const login = await ctx.request.post("/api/auth/login", {
    data: { email: "secretary@demo.local", password: "demo1234" },
  });
  if (!login.ok()) throw new Error("segment login failed");
  const page = await ctx.newPage();
  mouse = { x: viewport.width / 2, y: viewport.height / 2 };
  return {
    page,
    async finish() {
      const video = page.video();
      await ctx.close();
      const file = await video.path();
      const target = path.join(OUT_DIR, `${name}.webm`);
      renameSync(file, target);
      console.log(`✓ ${name}.webm`);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Deepgram live STT mock                                              */
/* ------------------------------------------------------------------ */
async function mockLiveTranscription(page) {
  await page.route("**/api/deepgram/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "promo-demo-token" }),
    }),
  );
  await page.routeWebSocket(/api\.deepgram\.com/, (ws) => {
    // Swallow client audio; drip a scripted critique back word by word.
    ws.onMessage(() => {});
    (async () => {
      await sleep(2200);
      for (const sentence of AXEL_LIVE_SENTENCES) {
        const words = sentence.split(" ");
        for (let i = 0; i < words.length; i++) {
          const partial = words.slice(0, i + 1).join(" ");
          const isLast = i === words.length - 1;
          try {
            ws.send(
              JSON.stringify({
                type: "Results",
                is_final: isLast,
                speech_final: isLast,
                channel: { alternatives: [{ transcript: partial }] },
              }),
            );
          } catch {
            return; // socket closed — recording stopped
          }
          await sleep(isLast ? 420 : 130);
        }
      }
    })();
  });
}

/* ------------------------------------------------------------------ */
/* Segments                                                            */
/* ------------------------------------------------------------------ */
async function recordRoster(browser) {
  const { page, finish } = await newRecordingPage(browser, {
    viewport: DESKTOP,
    name: "roster",
  });
  await page.goto("/admin/entries");
  await page.getByRole("cell", { name: "Axel vom Nordwald", exact: true }).waitFor();
  await sleep(1600);
  await glideTo(page, page.getByRole("cell", { name: "Rex von der Alten Muehle", exact: true }), { settle: 500 });
  await typeInto(page, page.getByLabel("Search roster"), "vom");
  await sleep(900);
  const clear = page.getByRole("button", { name: /clear search/i });
  if (await clear.count()) {
    await glideClick(page, clear.first());
  } else {
    await page.getByLabel("Search roster").fill("");
  }
  await sleep(1200);
  await finish();
}

async function recordRingside(browser) {
  const { page, finish } = await newRecordingPage(browser, {
    viewport: PHONE,
    name: "ringside",
    isMobile: true,
  });
  await mockLiveTranscription(page);

  await page.goto("/ringside");
  const judgeSelect = page.getByLabel("Judge");
  await judgeSelect.waitFor();
  await sleep(1200);
  await glideTo(page, judgeSelect, { settle: 250 });
  await judgeSelect.selectOption("Hans Richter");
  await sleep(900);

  const recordLink = page.getByRole("link", {
    name: "Record critique for Axel vom Nordwald",
  });
  await glideClick(page, recordLink, { after: 700 });

  // Skip the mic test on camera — the fake capture device label would show.
  await page.getByRole("button", { name: "Start recording" }).waitFor();
  await sleep(900);
  await glideClick(page, page.getByRole("button", { name: "Start recording" }), { after: 600 });
  await page.getByText("Live transcript", { exact: true }).waitFor({ timeout: 8000 });

  // Ease down so the live transcript panel is on screen while words arrive.
  await sleep(2600);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 52);
    await sleep(70);
  }

  // Let the mocked live transcript play out.
  await sleep(12800);

  await glideClick(page, page.getByRole("button", { name: "Stop & process" }), { after: 400 });
  await page.getByText(/Sent to review queue|Record critique/).first().waitFor({ timeout: 15000 });
  await sleep(2500);
  await finish();
}

async function recordReview(browser) {
  const { page, finish } = await newRecordingPage(browser, {
    viewport: DESKTOP,
    name: "review",
  });
  await page.goto("/admin/review");
  const row = page.getByRole("button", { name: /Axel vom Nordwald/ });
  await row.waitFor();
  await sleep(1500);
  await glideClick(page, row, { after: 900 });
  await page.getByLabel("Narrative (draft)").waitFor();
  await glideTo(page, page.getByLabel("Narrative (draft)"), { settle: 1400 });

  await glideClick(page, page.getByRole("button", { name: "Approve & release" }), { after: 600 });
  await glideClick(page, page.getByRole("button", { name: "Confirm" }), { after: 400 });
  await page.getByText(/Approved/i).first().waitFor({ timeout: 15000 });
  await sleep(2200);
  await finish();
}

async function recordPlacements(browser) {
  const { page, finish } = await newRecordingPage(browser, {
    viewport: DESKTOP,
    name: "placements",
  });
  await page.goto("/ringside/placements");
  await page.getByRole("heading", { name: /Open( Class)? — Male/ }).waitFor();
  await sleep(1400);

  const place = (dog, rank) =>
    page
      .getByRole("group", { name: `Placement for ${dog}` })
      .getByRole("button", { name: String(rank), exact: true });

  await glideClick(page, place("Rex von der Alten Muehle", 1));
  await glideClick(page, place("Gero vom Adlerhorst", 2));
  await glideClick(page, place("Bella von Ostsee", 1));
  await glideClick(page, place("Axel vom Nordwald", 1));
  await glideClick(page, place("Bruno von der Eiche", 2));
  await sleep(400);
  await glideClick(page, page.getByRole("button", { name: "Save placements" }), { after: 600 });
  await page.getByRole("main").getByText("Placements saved").waitFor();
  await sleep(1800);
  await finish();
}

async function recordReports(browser) {
  const { page, finish } = await newRecordingPage(browser, {
    viewport: DESKTOP,
    name: "reports",
  });
  await page.goto("/admin/reports");
  const rexHeading = page.getByRole("heading", { name: /Rex von der Alten Muehle/ });
  await rexHeading.waitFor();
  await sleep(1500);
  await glideClick(page, rexHeading, { after: 900 });
  const pdfLink = page.getByRole("link", { name: "Print TNRK critique PDF" });
  if (await pdfLink.count()) {
    await glideTo(page, pdfLink.first(), { settle: 1200 });
  }
  await sleep(1400);
  await finish();
}

/* ------------------------------------------------------------------ */
const SEGMENTS = {
  roster: recordRoster,
  ringside: recordRingside,
  review: recordReview,
  placements: recordPlacements,
  reports: recordReports,
};

async function main() {
  const requested = process.argv.slice(2);
  const names = requested.length > 0 ? requested : Object.keys(SEGMENTS);
  const reseed = requested.length === 0 || requested.includes("--seed");
  const segmentNames = names.filter((n) => SEGMENTS[n]);

  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
      "--force-color-profile=srgb",
      "--font-render-hinting=none",
    ],
  });

  if (reseed) {
    console.log("Seeding demo data…");
    await seed(browser);
  }

  console.log("Recording segments…");
  for (const name of segmentNames) {
    try {
      await SEGMENTS[name](browser);
    } catch (err) {
      for (const ctx of browser.contexts()) {
        for (const pg of ctx.pages()) {
          await pg
            .screenshot({ path: `/tmp/promo-fail-${name}.png`, fullPage: true })
            .catch(() => {});
        }
      }
      throw err;
    }
  }

  await browser.close();

  // Playwright leaves behind its own hashed .webm copies — remove them.
  for (const f of readdirSync(OUT_DIR)) {
    if (!/^(roster|ringside|review|placements|reports)\.webm$/.test(f)) {
      rmSync(path.join(OUT_DIR, f), { force: true });
    }
  }
  if (existsSync(OUT_DIR)) console.log(`Footage in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
