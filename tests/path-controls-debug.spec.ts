import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { EXPORT_VIDEO_LABEL } from "../src/app/features/canvas/canvas-side-panel/export-controls";

/** Opens the editor shell before interacting with the canvas. */
async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: EXPORT_VIDEO_LABEL })).toBeVisible();
}

/** Draws a closed curved path with the pen tool. */
async function drawClosedPath(page: Page) {
  const pathToolButton = page.locator("button[aria-label='Path tool']").first();
  await expect(pathToolButton).toBeVisible();
  await pathToolButton.click();

  const canvas = page.locator("canvas").first();
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Canvas bounds were not measurable.");
  }

  const anchors = [
    { x: bounds.x + 320, y: bounds.y + 210, dx: 80, dy: -40 },
    { x: bounds.x + 560, y: bounds.y + 200, dx: 10, dy: 85 },
    { x: bounds.x + 500, y: bounds.y + 470, dx: -100, dy: 40 },
    { x: bounds.x + 250, y: bounds.y + 360, dx: -70, dy: -45 },
  ];

  for (const anchor of anchors) {
    await page.mouse.move(anchor.x, anchor.y);
    await page.mouse.down();
    await page.mouse.move(anchor.x + anchor.dx, anchor.y + anchor.dy, { steps: 10 });
    await page.mouse.up();
  }

  await page.mouse.click(anchors[0].x, anchors[0].y);
}

/** Enters path edit mode by double-clicking the visible path. */
async function enterPathEditMode(page: Page) {
  const canvas = page.locator("canvas").first();
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Canvas bounds were not measurable.");
  }

  await page.mouse.dblclick(bounds.x + 430, bounds.y + 300);
}

test("captures path edit controls for debugging", async ({ page }, testInfo: TestInfo) => {
  await gotoEditor(page);
  await drawClosedPath(page);
  await enterPathEditMode(page);

  const canvasRegion = page.locator("[data-canvas_container]");
  await expect(canvasRegion).toBeVisible();
  await canvasRegion.screenshot({
    path: testInfo.outputPath("path-controls-debug.png"),
  });
});
