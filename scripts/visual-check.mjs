import { writeFile } from "node:fs/promises";

const playwrightModule =
  process.env.PLAYWRIGHT_CORE_PATH ||
  "playwright-core";
const { chromium } = await import(playwrightModule);

const url = process.argv[2] || "http://localhost:5173";
const outputPrefix = process.argv[3] || "C:/tmp/joyzone";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  headless: true
});

async function checkViewport(name, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const logs = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      logs.push({ type: message.type(), text: message.text() });
    }
  });

  await page.goto(url, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(2200);

  const screenshotPath = `${outputPrefix}-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const metrics = await page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right)
      };
    };

    return {
      viewport: { width: innerWidth, height: innerHeight },
      card: box(".joy-card"),
      slider: box(".slider-frame"),
      title: box("h1"),
      fields: [...document.querySelectorAll("input")].map((input) => ({
        placeholder: input.placeholder,
        rect: {
          x: Math.round(input.getBoundingClientRect().x),
          y: Math.round(input.getBoundingClientRect().y),
          width: Math.round(input.getBoundingClientRect().width),
          height: Math.round(input.getBoundingClientRect().height)
        }
      })),
      bodyText: document.body.innerText.slice(0, 320)
    };
  });

  await page.close();
  return { name, screenshotPath, metrics, logs };
}

const results = [
  await checkViewport("desktop", 1280, 720),
  await checkViewport("mobile", 390, 844)
];

await writeFile(`${outputPrefix}-report.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

await browser.close();
