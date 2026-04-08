import { expect, test, type Page } from "@playwright/test";
import { EXPORT_VIDEO_LABEL } from "../src/app/features/canvas/canvas-side-panel/export-controls";

/** Opens the editor and waits for the main shell to finish rendering. */
async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: EXPORT_VIDEO_LABEL })).toBeVisible();
}

/** Adds a canvas item through the floating tool dock. */
async function addCanvasItem(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
}

test("shows custom DOM handles for shift multi-selection", async ({ page }, testInfo) => {
  await gotoEditor(page);
  await addCanvasItem(page, "Add rectangle");
  await addCanvasItem(page, "Add circle");

  const layersPanel = page.getByTestId("floating-layers-panel").last();
  await layersPanel.getByRole("button", { name: "rectangle", exact: true }).click();
  await layersPanel
    .getByRole("button", { name: "circle", exact: true })
    .click({ modifiers: ["Shift"] });

  const resizeHandles = page.getByRole("button", { name: "Resize selection" });
  await expect(resizeHandles).toHaveCount(8);
  await expect(page.getByRole("button", { name: "Rotate selection" })).toBeVisible();

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("dom-multiselect-handles.png"),
  });
});
