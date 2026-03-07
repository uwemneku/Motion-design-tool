import { expect, test, type Page } from "@playwright/test";

/** Opens the editor and waits for the video area controls to render. */
async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview video area screenshot" }),
  ).toBeVisible();
}

test("shows the fullscreen video area preview", async ({ page }, testInfo) => {
  await gotoEditor(page);

  await page.getByRole("button", { name: "Add rectangle" }).click();
  await page.getByRole("button", { name: "Preview video area screenshot" }).click();

  await expect(page.getByAltText("Video area preview")).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("video-area-preview-overlay.png"),
  });
});
