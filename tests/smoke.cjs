const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8137);
const BASE = `http://127.0.0.1:${PORT}/`;

async function waitForServer(url, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not start at ${url}`);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch (error) {
    return chromium.launch({ headless: true });
  }
}

(async () => {
  const server = spawn("python3", ["-m", "http.server", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore",
  });
  const stop = () => {
    try {
      server.kill();
    } catch (error) {
      // Already stopped.
    }
  };
  process.on("exit", stop);

  let browser;
  try {
    await waitForServer(BASE);
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".agenda-item").count(), 0, "starts empty");
    assert.equal(await page.locator("#emptyState").isVisible(), true, "empty state visible");
    console.log("✓ empty state");

    await page.locator("#addButton").click();
    await page.locator("#blockTitle").fill("写产品方案");
    await page.locator("#blockStart").fill("09:00");
    await page.locator("#blockEnd").fill("10:30");
    await page.locator(".category-option.cat-focus").click();
    await page.locator("#saveBlock").click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".agenda-item").count(), 1, "adds a block");
    assert.match(await page.locator(".item-time").textContent(), /09:00/);
    console.log("✓ add block");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".agenda-item").count(), 1, "persists after reload");
    console.log("✓ persistence");

    await page.locator(".item-check").click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator(".agenda-item").first().evaluate((el) => el.classList.contains("is-done")), true);
    console.log("✓ completion");

    await page.locator("#menuButton").click();
    await page.locator('[data-action="templates"]').click();
    await page.locator('[data-template="deep"]').click();
    await page.locator('[data-confirm="ok"]').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".agenda-item").count(), 5, "template applied");
    console.log("✓ template");

    const beforeTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.locator("#themeToggle").click();
    const afterTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    assert.notEqual(beforeTheme, afterTheme, "theme toggles");
    console.log("✓ theme");

    const box = await page.locator("#dial").boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const radius = box.width * 0.36;
    const point = (minute) => {
      const angle = ((((minute - 360) / 1440) * 360 - 90) * Math.PI) / 180;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    };
    const [x1, y1] = point(840);
    const [x2, y2] = point(930);
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#blockDialog").getAttribute("open") !== null, true, "drag opens editor");
    assert.equal(await page.locator("#blockStart").inputValue(), "14:00");
    assert.equal(await page.locator("#blockEnd").inputValue(), "15:30");
    await page.locator("#blockDialog [data-close-dialog]").first().click();
    console.log("✓ dial drag");

    const sw = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return null;
      const registration = await navigator.serviceWorker.ready;
      return { scope: registration.scope, active: Boolean(registration.active) };
    });
    assert.ok(sw?.active, "service worker active");
    console.log("✓ service worker");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${BASE}?demo=1`, { waitUntil: "networkidle" });
    await mobile.waitForTimeout(400);
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 1, `mobile has no horizontal overflow (${overflow}px)`);
    await mobile.locator("#addButton").click();
    const dialog = await mobile.locator("#blockDialog").boundingBox();
    assert.ok(dialog.width <= 370, "dialog fits mobile width");
    assert.ok(dialog.height <= 844, "dialog fits mobile height");
    await mobile.locator("#blockDialog [data-close-dialog]").first().click();
    console.log("✓ mobile");

    assert.deepEqual(errors, [], `no console/page errors: ${errors.join(" | ")}`);
    console.log("✓ no console errors");
    console.log("\nAll smoke checks passed.");
  } finally {
    await browser?.close();
    stop();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
