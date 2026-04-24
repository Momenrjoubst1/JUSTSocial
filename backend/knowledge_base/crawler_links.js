
const { chromium } = require("playwright");const { chromium.jo/Documents",
  "https://www.just.edu.jo/aboutjust/Pages/Publications.aspx",
  "https://www.just.edu.jo/aboutjust/Pages/StratigicPlan.aspx",
  "https://www.just.edu.jo/aboutjust",
  "https://www.just.edu.jo/Admission"
];

const BASE_HOST = "just.edu.jo";
const MAX_PAGES = 80; // عدّلها إذا أردت

const visited = new Set();
const queued = new Set();
const queue = [];
const pdfLinks = new Set();

function enqueue(url) {
  if (!url) return;
  if (visited.has(url) || queued.has(url)) return;
  queued.add(url);
  queue.push(url);
}

function isInternal(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes(BASE_HOST);
  } catch {
    return false;
  }
}

function normalizeUrl(href, currentUrl) {
  if (!href) return null;
  const raw = String(href).trim();
  if (!raw) return null;
  if (
    raw.startsWith("javascript:") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:") ||
    raw === "#"
  ) {
    return null;
  }

  try {
    return new URL(raw, currentUrl).href.split("#")[0];
  } catch {
    return null;
  }
}

function extractPdfCandidatesFromText(text, currentUrl) {
  const results = [];
  if (!text || !String(text).toLowerCase().includes(".pdf")) return results;

  const str = String(text);
  const regex =
    /(?:https?:\/\/[^\s'"]+\.pdf(?:\?[^\s'"]*)?|(?:\.{1,2}\/|\/)[^\s'"]+\.pdf(?:\?[^\s'"]*)?)/gi;

  const matches = str.match(regex) || [];
  for (const m of matches) {
    const normalized = normalizeUrl(m, currentUrl);
    if (normalized && /\.pdf($|[?#])/i.test(normalized)) {
      results.push(normalized);
    }
  }
  return results;
}

async function visitPage(page, url) {
  if (visited.has(url)) return;
  visited.add(url);

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
  } catch {
    console.log("⚠️ Partial load:", url);
  }

  await page.waitForTimeout(3000);

  // 1) التقاط PDF من network
  // (سنضيف listener مرة واحدة خارج هذه الدالة)

  // 2) التقاط href العادي
  const anchors = await page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: a.getAttribute("href") || "",
      abs: a.href || "",
      onclick: a.getAttribute("onclick") || "",
      text: (a.textContent || "").trim()
    }))
  );

  for (const a of anchors) {
    const normalized = normalizeUrl(a.href || a.abs, url);
    if (normalized) {
      if (/\.pdf($|[?#])/i.test(normalized)) {
        pdfLinks.add(normalized);
      } else if (isInternal(normalized)) {
        enqueue(normalized);
      }
    }

    for (const found of extractPdfCandidatesFromText(a.onclick, url)) {
      pdfLinks.add(found);
    }
  }

  // 3) التقاط onclick / data-* التي قد تخبئ رابط PDF
  const specials = await page.$$eval("[onclick],[data-url],[data-href],[data-file]", (els) =>
    els.map((el) => ({
      onclick: el.getAttribute("onclick") || "",
      dataUrl: el.getAttribute("data-url") || "",
      dataHref: el.getAttribute("data-href") || "",
      dataFile: el.getAttribute("data-file") || "",
      text: (el.textContent || "").trim()
    }))
  );

  for (const s of specials) {
    const blobs = [s.onclick, s.dataUrl, s.dataHref, s.dataFile, s.text];
    for (const blob of blobs) {
      const found = extractPdfCandidatesFromText(blob, url);
      for (const f of found) pdfLinks.add(f);
    }
  }

  console.log(`📄 visited=${visited.size} | pdfs=${pdfLinks.size} | ${url}`);
}

(async () => {
  START_URLS.forEach(enqueue);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("response", (res) => {
    try {
      const url = res.url();
      if (url.toLowerCase().includes(".pdf")) {
        pdfLinks.add(url);
      }
    } catch {}
  });

  while (queue.length && visited.size < MAX_PAGES) {
    const next = queue.shift();
    await visitPage(page, next);
  }

  fs.writeFileSync(
    "file_links.json",
    JSON.stringify([...pdfLinks], null, 2),
    "utf8"
  );

  console.log(`✅ DONE. Total PDF links found: ${pdfLinks.size}`);
  await browser.close();
})();
const fs = require("fs");

const START_URLS = [
