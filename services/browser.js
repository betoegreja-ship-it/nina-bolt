import Browserbase from "@browserbasehq/sdk";
import { chromium } from "playwright-core";
import dotenv from "dotenv";
dotenv.config();

export async function browseWeb(task, url = null) {
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
  
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  });

  const browser = await chromium.connectOverCDP(session.connectUrl);
  const page = browser.contexts()[0]?.pages()[0] || await browser.newPage();

  let result = "";

  try {
    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } else {
      await page.goto("https://www.google.com", { waitUntil: "domcontentloaded" });
      await page.fill('textarea[name="q"]', task);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("domcontentloaded");
    }

    await page.waitForTimeout(2000);
    result = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  } finally {
    await browser.close();
  }

  return result;
}
