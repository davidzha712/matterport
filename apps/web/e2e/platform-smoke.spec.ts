import { expect, test } from "@playwright/test";

test("home page exposes the multi-project immersive platform entry points", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("h1")).toContainText(/Immersive Wissensraeume/i);
  await expect(page.locator("main")).toContainText(/Matterport wird zur Buehne/i);
  await expect(page.getByRole("link", { name: /live-space betreten/i })).toBeVisible();
});

test("space shell keeps control layers visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spaces/orchard-main-house/explore", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("button", { name: /analyse starten/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /raummodi/i })).toBeVisible();
});

test("review center exposes pending queue items", async ({ page }) => {
  await page.goto("/review-center", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toContainText(/offene ki-vorschlaege/i);
  await expect(page.getByRole("main")).toContainText(/walnut cabinet/i);
  await expect(page.getByRole("link", { name: /immersive pruefung/i }).first()).toBeVisible();
});
