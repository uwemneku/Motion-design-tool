import { expect, test, type Page } from "@playwright/test";
import { EXPORT_VIDEO_LABEL } from "../src/app/features/canvas/canvas-side-panel/export-controls";

/** Opens the editor and waits for the main workspace shell. */
async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(
    page.getByRole("button", { name: EXPORT_VIDEO_LABEL }),
  ).toBeVisible();
}

test("captures the svg import modal", async ({ page }, testInfo) => {
  await gotoEditor(page);

  await page.getByRole("button", { name: "Import assets" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    mimeType: "image/svg+xml",
    name: "shape.svg",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
        '<rect width="120" height="120" rx="16" fill="#60a5fa" />' +
        '<circle cx="60" cy="60" r="24" fill="#0f172a" />' +
      "</svg>",
    ),
  });

  const dialog = page.getByRole("dialog", { name: "Import SVG" });
  await expect(dialog).toBeVisible();

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("svg-import-modal.png"),
  });
});
