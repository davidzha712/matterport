import { expect, test } from "@playwright/test";

test("home page exposes the multi-project immersive platform entry points", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /spaces|immersive/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /explore/i }).first()).toBeVisible();
});
