import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.SITE_URL ?? "http://localhost:3000";
const OUTPUT_ROOT = path.resolve(process.cwd(), "artifacts", "screenshots");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUTPUT_DIR = path.join(OUTPUT_ROOT, stamp);

const browserCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const staticRoutes = [
  { path: "/", file: "home" },
  { path: "/build", file: "build" },
  { path: "/calculator", file: "calculator" },
  { path: "/research", file: "research-index" },
  { path: "/research/llm-mechanics", file: "research-llm-mechanics" },
  { path: "/research/geo-tools", file: "research-geo-tools" },
  { path: "/research/landscape", file: "research-landscape" },
  { path: "/research/economics", file: "research-economics" },
  { path: "/research/papers", file: "research-papers" },
];

function resolveBrowserExecutable() {
  for (const candidate of browserCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No Chrome or Edge executable found. Set PUPPETEER_EXECUTABLE_PATH to a valid browser path."
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function writeManifest(entries) {
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  await fsp.writeFile(manifestPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

async function writeGallery(entries) {
  const items = entries
    .map(
      (entry) => `
        <article class="card">
          <div class="meta">
            <strong>${entry.path}</strong>
            <span>${entry.file}</span>
          </div>
          <a href="./${entry.file}" target="_blank" rel="noreferrer">
            <img src="./${entry.file}" alt="${entry.path}" loading="lazy" />
          </a>
        </article>
      `
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bitsy Screenshot Gallery</title>
    <style>
      :root {
        color-scheme: light;
        --paper: #f3ecdf;
        --panel: #fbf7f0;
        --ink: #1d1a16;
        --muted: #6b6257;
        --line: rgba(39, 33, 27, 0.14);
      }
      body {
        margin: 0;
        padding: 32px;
        background: linear-gradient(180deg, #f8f3ea 0%, var(--paper) 100%);
        color: var(--ink);
        font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 32px;
      }
      p {
        margin: 0 0 24px;
        color: var(--muted);
      }
      .grid {
        display: grid;
        gap: 20px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(32, 27, 21, 0.05);
      }
      .meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid var(--line);
      }
      .meta span {
        color: var(--muted);
      }
      img {
        display: block;
        width: 100%;
        height: auto;
      }
      a {
        color: inherit;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <h1>Bitsy Screenshot Gallery</h1>
    <p>${entries.length} captured routes from ${BASE_URL}</p>
    <section class="grid">${items}</section>
  </body>
</html>`;

  await fsp.writeFile(path.join(OUTPUT_DIR, "index.html"), html, "utf8");
}

async function capture(page, route, manifest) {
  const url = new URL(route.path, BASE_URL).toString();
  const target = path.join(OUTPUT_DIR, `${route.file}.png`);

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.screenshot({ path: target, fullPage: true });

  manifest.push({
    file: path.basename(target),
    path: route.path,
    url,
  });
}

async function clickByText(page, selector, text) {
  const clicked = await page.evaluate(
    ({ selector, text }) => {
      const match = [...document.querySelectorAll(selector)].find((node) =>
        node.textContent?.trim().includes(text)
      );

      if (!(match instanceof HTMLElement)) {
        return false;
      }

      match.click();
      return true;
    },
    { selector, text }
  );

  if (!clicked) {
    throw new Error(`Could not find ${selector} containing "${text}"`);
  }
}

async function captureSimulatorFlow(browser, manifest) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });

  await capture(page, { path: "/simulate", file: "simulate-setup" }, manifest);

  await clickByText(page, "button", "CRM Software");
  await sleep(200);
  await clickByText(page, "button", "Run test");
  await page.waitForFunction(() => window.location.pathname === "/simulate/results", {
    timeout: 15000,
  });
  await page.waitForSelector("table");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "simulate-results.png"),
    fullPage: true,
  });
  manifest.push({
    file: "simulate-results.png",
    path: "/simulate/results",
    url: new URL("/simulate/results", BASE_URL).toString(),
  });

  await page.goto(new URL("/simulate/compare", BASE_URL).toString(), {
    waitUntil: "networkidle0",
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "simulate-compare.png"),
    fullPage: true,
  });
  manifest.push({
    file: "simulate-compare.png",
    path: "/simulate/compare",
    url: new URL("/simulate/compare", BASE_URL).toString(),
  });

  await page.goto(new URL("/simulate/trends", BASE_URL).toString(), {
    waitUntil: "networkidle0",
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "simulate-trends.png"),
    fullPage: true,
  });
  manifest.push({
    file: "simulate-trends.png",
    path: "/simulate/trends",
    url: new URL("/simulate/trends", BASE_URL).toString(),
  });

  await page.close();
}

async function main() {
  const executablePath = resolveBrowserExecutable();
  await ensureDir(OUTPUT_DIR);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const manifest = [];

  try {
    const page = await browser.newPage();
    for (const route of staticRoutes) {
      await capture(page, route, manifest);
    }
    await page.close();

    await captureSimulatorFlow(browser, manifest);
    await writeManifest(manifest);
    await writeGallery(manifest);

    process.stdout.write(`Saved ${manifest.length} screenshots to ${OUTPUT_DIR}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
