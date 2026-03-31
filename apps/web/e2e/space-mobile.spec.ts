import { expect, test } from "@playwright/test"

test.use({
  viewport: {
    height: 844,
    width: 390
  }
})

test("immersive shell recalls command and object layers on mobile", async ({ page }) => {
  await page.goto("/spaces/orchard-main-house/explore", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("main")).toBeVisible()
  await expect(page.getByLabel(/raumkontext/i)).toBeVisible()
  await expect(page.getByRole("textbox", { name: /^url$/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /^suchen$/i })).toBeDisabled()
})
