import { expect, test } from "@playwright/test";

test("editor loads without runtime crash", async ({ page }) => {
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/");
  await expect(page.locator("[data-canvas_container]")).toBeVisible();

  expect(pageErrors).toEqual([]);
});
