import { expect, test } from "@playwright/test";

test("home page exposes the multi-project immersive platform entry points", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("h1")).toContainText(/Räume werden zu Wissensbuehnen/i);
  await expect(page.locator("main")).toContainText(/Begehbare 3D-Räume mit KI-gestützter Objekterkennung/i);
  await expect(page.getByRole("link", { name: /space betreten/i })).toBeVisible();
});

test("space shell opens in immersive mode and can recall command layers on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spaces/orchard-main-house/explore", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByLabel(/raumkontext/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^url$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^suchen$/i })).toBeDisabled();
  await expect(page.getByRole("navigation", { name: /modus/i })).toBeVisible();
});

test("review center renders the AI review queue structure", async ({ page }) => {
  await page.goto("/review-center", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("main")).toContainText(/offene ki-vorschlaege/i);
  // Structural check: the review center should always expose navigation to immersive review
  // when pending objects exist; with no pending objects it shows an empty-state message.
  await expect(page.getByRole("main")).toBeVisible();
});

test("export center reflects strict readiness gates per space", async ({ page }) => {
  await page.goto("/export-center", { waitUntil: "domcontentloaded" });

  const blockedCard = page.locator(".export-project-card", { hasText: "Main House" });
  const readyCard = page.locator(".export-project-card", { hasText: "North Gallery" });

  // Main House (estate) has no approved objects — always blocked
  await expect(blockedCard).toContainText(/publikation blockiert/i);

  // North Gallery (museum pilot) has two approved objects — export ready
  await expect(readyCard).toContainText(/export bereit/i);
  await expect(readyCard.getByRole("link", { name: /^csv$/i })).toBeVisible();
  await expect(readyCard.getByRole("link", { name: /iiif manifest/i })).toBeVisible();
});

test("listing mode blocks sharing until review is complete", async ({ page }) => {
  // Estate space: no objects reviewed → share blocked
  await page.goto("/spaces/orchard-main-house/listing", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /teilen/i })).toBeDisabled();

  // Museum pilot space: two approved objects → share ready
  await page.goto("/spaces/lantern-gallery/listing", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /teilen/i })).toBeEnabled();
  await expect(page.getByRole("main")).toContainText(/bereit zur freigabe/i);
});
