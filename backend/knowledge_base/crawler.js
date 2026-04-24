
const { chromium } = require("playwright");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BASE_HOST = "www.just.edu.jo";
const START_URLS = [
  "https://www.just.edu.jo/aboutjust",
  "https://www.just.edu.jo/Admission",
  "https://www.just.edu.jo/Faculties",
  "https://www.just.edu.jo/Documents",
  "https://www.just.edu.jo/ar"
];

// عدّل هذه القيم حسب الحاجة
const MAX_PAGES = 120;             // أقصى عدد صفحات نزورها
const CLICK_LIMIT_PER_PAGE = 25;   // أقصى عناصر نجرب الضغط عليها في الصفحة
const WAIT_AFTER_GOTO_MS = 3500;   // انتظار بعد فتح الصفحة
const WAIT_AFTER_CLICK_MS = 1000;  // انتظار بعد الضغط
const PDF_TIMEOUT_MS = 45000;      // مهلة تنزيل وتحليل PDF
const HEADLESS = true;             // إذا واجهت مشاكل، غيّرها إلى false

const visited = new Set();
const queued = new Set();
const queue = [];
const pdfLinks = new Set();
const logs = {
  pagesVisited: 0,
  pdfFound: 0,
  pdfConverted: 0,
  pdfFailed: 0,
  failedUrls: []
};

function enqueue(url) {
  if (!url) return;
  if (visited.has(url)) return;
  if (queued.has(url)) return;
  queued.add(url);
  queue.push(url);
}

function isInternal(url) {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().includes(BASE_HOST);
  } catch {
    return false;
  }
}

function isPdfUrl(url) {
  return /\.pdf($|[?#])/i.test(url);
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
    const url = new URL(raw, currentUrl).href;
    return url.split("#")[0];
  } catch {
    return null;
  }
}

function extractPdfCandidatesFromText(text, currentUrl) {
  const results = [];
  if (!text || !String(text).toLowerCase().includes(".pdf")) return results;

  const str = String(text);

  // أمثلة يلتقطها:
  // https://.../file.pdf
  // /Documents/file.pdf
  // ../docs/file.pdf
  const regex =
    /(?:https?:\/\/[^\s'"]+\.pdf(?:\?[^\s'"]*)?|(?:\.{1,2}\/|\/)[^\s'"]+\.pdf(?:\?[^\s'"]*)?)/gi;

  const matches = str.match(regex) || [];
  for (const m of matches) {
    const normalized = normalizeUrl(m, currentUrl);
    if (normalized && isPdfUrl(normalized)) {
      results.push(normalized);
    }
  }

  return results;
}

function safeFileNameFromUrl(url) {
  let base = "document";
  try {
    const u = new URL(url);
    base = path.basename(decodeURIComponent(u.pathname)) || "document.pdf";
  } catch {
    base = "document.pdf";
  }

  base = base.replace(/\.pdf$/i, "");
  base = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  base = base.replace(/\s+/g, "_");
  if (!base) base = "document";

  const hash = crypto
    .createHash("md5")
    .update(url)
    .digest("hex")
    .slice(0, 8);

  return `${base}__${hash}.txt`;
}

function addPdf(url) {
  if (!url) return;
  if (!isPdfUrl(url)) return;
  pdfLinks.add(url);
}

async function convertPdfToTxt(url) {
  const fileName = safeFileNameFromUrl(url);
  const safeUrl = encodeURI(url);

  try {
    const res = await axios.get(safeUrl, {
      responseType: "arraybuffer",
      timeout: PDF_TIMEOUT_MS,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0"
      },
      validateStatus: (s) => s >= 200 && s < 400
    });

    const parsed = await pdfParse(res.data);
    const text = (parsed.text || "").trim();

    fs.writeFileSync(fileName, text, "utf8");
    logs.pdfConverted += 1;
    console.log(`✅ TXT saved: ${fileName}`);
  } catch (err) {
    logs.pdfFailed += 1;
    logs.failedUrls.push(url);
    console.log(`❌ Failed PDF: ${url}`);
  }
}

async function visitPage(page, url) {
  if (visited.has(url)) return;
  visited.add(url);
  logs.pagesVisited += 1;

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
  } catch {
    console.log(`⚠️ Partial load, continuing: ${url}`);
  }

  await page.waitForTimeout(WAIT_AFTER_GOTO_MS);

  // 1) كل href النهائية بعد تنفيذ JS
  const hrefs = await page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: a.getAttribute("href") || "",
      absoluteHref: a.href || "",
      text: (a.textContent || "").trim(),
      onclick: a.getAttribute("onclick") || ""
    }))
  );

  for (const item of hrefs) {
    const normalized = normalizeUrl(item.href || item.absoluteHref, url);
    if (!normalized) continue;

    if (isPdfUrl(normalized)) {
      addPdf(normalized);
    } else if (isInternal(normalized)) {
      enqueue(normalized);
    }

    for (const found of extractPdfCandidatesFromText(item.onclick, url)) {
      addPdf(found);
    }
  }

  // 2) عناصر فيها onclick أو data-* قد تشير لملفات
  const specialAttrs = await page.$$eval("[onclick],[data-url],[data-href],[data-file]", (els) =>
    els.map((el) => ({
      onclick: el.getAttribute("onclick") || "",
      dataUrl: el.getAttribute("data-url") || "",
      dataHref: el.getAttribute("data-href") || "",
      dataFile: el.getAttribute("data-file") || "",
      text: (el.textContent || "").trim()
    }))
  );

  for (const item of specialAttrs) {
    const blobs = [item.onclick, item.dataUrl, item.dataHref, item.dataFile, item.text];
    for (const blob of blobs) {
      const found = extractPdfCandidatesFromText(blob, url);
      for (const f of found) addPdf(f);
    }
  }

  // 3) نجرب الضغط على بعض العناصر المحتملة لالتقاط الروابط الديناميكية
  const candidates = await page.$$("a, button, [onclick], [role='button']");
  const clickCount = Math.min(candidates.length, CLICK_LIMIT_PER_PAGE);

  for (let i = 0; i < clickCount; i++) {
    try {
      const before = page.url();
      await candidates[i].click({ timeout: 800 });
      await page.waitForTimeout(WAIT_AFTER_CLICK_MS);

      const after = page.url();

      if (after !== before) {
        if (isPdfUrl(after)) {
          addPdf(after);
        } else if (isInternal(after)) {
          enqueue(after);
        }

        // إذا انتقل لصفحة أخرى، ارجع
        try {
          await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForTimeout(800);
        } catch {}
      }
    } catch {}
  }
}

async function main() {
  for (const u of START_URLS) enqueue(u);

  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage();

  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  // أي PDF يظهر في الشبكة
  page.on("response", (res) => {
    try {
      const url = res.url();
      if (isPdfUrl(url)) addPdf(url);
    } catch {}
  });

  // أي Popup يفتح PDF
  page.on("popup", async (popup) => {
    try {
      await popup.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
      const popupUrl = popup.url();
      if (isPdfUrl(popupUrl)) addPdf(popupUrl);
      await popup.close().catch(() => {});
    } catch {}
  });

  console.log("🌐 Starting crawl...");

  while (queue.length && visited.size < MAX_PAGES) {
    const nextUrl = queue.shift();
    try {
      await visitPage(page, nextUrl);
      console.log(`📄 Pages visited: ${visited.size} | PDFs found: ${pdfLinks.size}`);
    } catch (err) {
      console.log(`⚠️ Skipped page: ${nextUrl}`);
    }
  }

  await browser.close();

  logs.pdfFound = pdfLinks.size;

  // حفظ جميع روابط الـ PDF
  fs.writeFileSync("file_links.json", JSON.stringify([...pdfLinks], null, 2), "utf8");

  console.log(`\n✅ Crawl done. PDFs found: ${pdfLinks.size}`);
  console.log("⬇️ Converting PDFs to TXT...\n");

  for (const url of pdfLinks) {
    await convertPdfToTxt(url);
  }

  fs.writeFileSync("download_log.json", JSON.stringify(logs, null, 2), "utf8");

  console.log("\n🎉 Finished.");
  console.log(`📄 TXT created: ${logs.pdfConverted}`);
  console.log(`❌ Failed PDFs: ${logs.pdfFailed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
