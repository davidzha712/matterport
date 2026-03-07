import { expect, test } from "@playwright/test";

test("home page exposes the multi-project immersive platform entry points", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("h1")).toContainText(/Raeumliche Intelligenz/i);
  await expect(page.locator("main")).toContainText(/Matterport wird zur Buehne/i);
  await expect(page.getByRole("link", { name: /live-space betreten/i })).toBeVisible();
});

test("space shell keeps control layers visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spaces/orchard-main-house/explore");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("button", { name: /analyse starten/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /raummodi/i })).toBeVisible();
});
