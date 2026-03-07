import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { EXPORT_VIDEO_LABEL } from "../src/app/features/canvas/canvas-side-panel/export-controls";

/** Waits for the editor shell to finish initial render. */
async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: EXPORT_VIDEO_LABEL })).toBeVisible();
}

/** Adds a canvas item through the floating canvas tools. */
async function addCanvasItem(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
}

/** Selects a layer row by its exact name. */
async function selectLayer(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^${escapeRegex(name)}$`) }).click();
}

/** Saves a screenshot into the test output folder for visual review. */
async function saveShot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(name),
  });
}

test.describe("Editor visual review", () => {
  test("captures the default editor shell", async ({ page }, testInfo) => {
    await gotoEditor(page);

    await saveShot(page, testInfo, "editor-shell.png");
    await expect(page).toHaveScreenshot("editor-shell-baseline.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("captures a populated design state", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add text");
    await selectLayer(page, "rectangle");

    await expect(page.getByRole("button", { name: "Design" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add keyframe for Position X" }),
    ).toBeVisible();

    await saveShot(page, testInfo, "editor-design-panel.png");
    await expect(page).toHaveScreenshot("editor-design-panel-baseline.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("captures a crowded editor review state", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await addCanvasItem(page, "Add text");
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add line");
    await selectLayer(page, "circle");

    await saveShot(page, testInfo, "editor-crowded-review.png");
  });

  test("captures the animation template panel", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectLayer(page, "rectangle");
    await page.getByRole("button", { name: "Anim" }).click();

    await expect(page.getByText("Animation Templates")).toBeVisible();

    await saveShot(page, testInfo, "editor-animation-panel.png");
    await expect(page).toHaveScreenshot("editor-animation-panel-baseline.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("captures timeline zoom review state", async ({ page }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await page.getByRole("button", { name: "Zoom in timeline" }).click();
    await page.getByRole("button", { name: "Zoom in timeline" }).click();

    await page.screenshot({
      fullPage: true,
      path: "test-results/playwright/timeline-zoom-review.png",
    });
  });

  test("keeps the timeline toolbar fixed while zoomed content scrolls", async ({
    page,
  }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");

    const zoomInButton = page.getByRole("button", { name: "Zoom in timeline" });
    await zoomInButton.click();
    await zoomInButton.click();
    await zoomInButton.click();
    await zoomInButton.click();

    const toolbar = page.getByTestId("timeline-toolbar");
    const toolbarBefore = await toolbar.boundingBox();
    if (!toolbarBefore) {
      throw new Error("Timeline toolbar was not measurable before scroll.");
    }

    const timelineViewport = page
      .getByTestId("timeline")
      .locator(".timeline-scroll-viewport");
    await timelineViewport.evaluate((element) => {
      element.scrollLeft = 480;
      element.dispatchEvent(new Event("scroll"));
    });

    await saveShot(page, testInfo, "timeline-toolbar-scroll.png");

    const toolbarAfter = await toolbar.boundingBox();
    if (!toolbarAfter) {
      throw new Error("Timeline toolbar was not measurable after scroll.");
    }

    expect(Math.abs(toolbarAfter.x - toolbarBefore.x)).toBeLessThan(1);
  });
});

/** Escapes text for safe use inside a RegExp constructor. */
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
