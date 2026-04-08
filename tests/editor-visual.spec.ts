import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { EXPORT_VIDEO_LABEL } from "../src/app/features/canvas/canvas-side-panel/export-controls";

/** Waits for the editor shell to finish initial render. */
async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: EXPORT_VIDEO_LABEL })).toBeVisible();
}

/** Adds a canvas item through the floating canvas tools. */
async function addCanvasItem(page: Page, label: string) {
  const button = page.getByRole("button", { name: label });
  await expect(button).toBeVisible();
  await button.click();
}

/** Selects a layer row by its exact name. */
async function selectLayer(page: Page, name: string) {
  await page
    .getByTestId("floating-layers-panel")
    .getByRole("button", { name: new RegExp(`^${escapeRegex(name)}$`) })
    .click();
}

/** Renames a layer row through the inline edit flow. */
async function renameLayer(page: Page, currentName: string, nextName: string) {
  const layerButton = page
    .getByTestId("floating-layers-panel")
    .getByRole("button", { name: new RegExp(`^${escapeRegex(currentName)}$`) })
    .first();

  await layerButton.dblclick();

  const renameInput = page
    .getByTestId("floating-layers-panel")
    .locator('input[type="text"]')
    .first();

  await expect(renameInput).toBeVisible();
  await renameInput.fill(nextName);
  await renameInput.press("Enter");
}

/** Moves the timeline playhead to a relative position across the ruler. */
async function seekTimeline(page: Page, fraction: number) {
  const ruler = page
    .getByTestId("timeline")
    .getByTitle("Click to move playhead")
    .first();
  const bounds = await ruler.boundingBox();
  if (!bounds) {
    throw new Error("Timeline ruler was not measurable.");
  }

  await page.mouse.click(
    bounds.x + bounds.width * fraction,
    bounds.y + bounds.height / 2,
  );
}

/** Scrolls the visible side-panel content to expose lower controls. */
async function scrollSidePanel(page: Page, top: number) {
  await page
    .getByTestId("canvas-side-panel")
    .locator("[data-container]")
    .evaluate((element, nextTop) => {
      element.scrollTop = nextTop;
      element.dispatchEvent(new Event("scroll"));
    }, top);
}

/** Builds a richer canvas scene before taking design-focused screenshots. */
async function buildDesignReviewState(page: Page) {
  await addCanvasItem(page, "Add rectangle");
  await addCanvasItem(page, "Add circle");
  await addCanvasItem(page, "Add text");
  await selectLayer(page, "rectangle");
  await seekTimeline(page, 0.32);
  await page.getByRole("button", { name: "Add keyframe for Position X" }).click();
  await scrollSidePanel(page, 220);
}

/** Builds an animation-focused state with populated layers and timeline context. */
async function buildAnimationReviewState(page: Page) {
  await addCanvasItem(page, "Add rectangle");
  await addCanvasItem(page, "Add circle");
  await addCanvasItem(page, "Add text");
  await selectLayer(page, "rectangle");
  await seekTimeline(page, 0.48);
  await page.getByRole("button", { name: "Add keyframe for Position X" }).click();
  await page.getByRole("button", { name: "Zoom in timeline" }).click();
  await page.getByRole("button", { name: "Zoom in timeline" }).click();
}

/** Saves a screenshot into the test output folder for visual review. */
async function saveShot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(name),
  });
}

/** Saves a focused locator screenshot into the test output folder for visual review. */
async function saveLocatorShot(
  locator: Locator,
  testInfo: TestInfo,
  name: string,
) {
  await locator.screenshot({
    path: testInfo.outputPath(name),
  });
}

test.describe("Editor visual review", () => {
  test("captures the default editor shell", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await selectLayer(page, "circle");

    await saveShot(page, testInfo, "editor-shell.png");
    await expect(page).toHaveScreenshot("editor-shell-baseline.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("captures a populated design state", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await buildDesignReviewState(page);

    await expect(
      page.getByTestId("canvas-side-panel").getByRole("button", { name: "Design" }),
    ).toBeVisible();
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
    await seekTimeline(page, 0.58);
    await page.getByRole("button", { name: "Add keyframe for Position X" }).click();
    await page.getByRole("button", { name: "Play timeline" }).click();
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Pause timeline" }).click();

    await saveShot(page, testInfo, "editor-crowded-review.png");
  });

  test("captures the animation template panel", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await buildAnimationReviewState(page);
    await page
      .getByTestId("canvas-side-panel")
      .getByRole("button", { name: "Anim", exact: true })
      .click();

    await expect(page.getByText("Animation Templates")).toBeVisible();

    await saveShot(page, testInfo, "editor-animation-panel.png");
    await expect(page).toHaveScreenshot("editor-animation-panel-baseline.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("captures the chars rise text effect result", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add text");
    await selectLayer(page, "text");

    const sidePanel = page.getByTestId("canvas-side-panel");
    await sidePanel.getByRole("button", { name: "Animation", exact: true }).click();
    await expect(
      sidePanel.getByRole("heading", { name: "Text Effects", exact: true }),
    ).toBeVisible();

    await sidePanel.getByRole("button", { name: /Chars Rise/i }).click();
    await page.waitForTimeout(150);

    await saveShot(page, testInfo, "text-chars-rise-review.png");
    await saveLocatorShot(page.locator("main"), testInfo, "text-chars-rise-canvas.png");
    await seekTimeline(page, 0.05);
    await saveShot(page, testInfo, "text-chars-rise-mid-review.png");
  });

  test("captures timeline zoom review state", async ({ page }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await addCanvasItem(page, "Add text");
    await selectLayer(page, "circle");
    await seekTimeline(page, 0.44);
    await page.getByRole("button", { name: "Add keyframe for Position X" }).click();
    await page.getByRole("button", { name: "Zoom in timeline" }).click();
    await page.getByRole("button", { name: "Zoom in timeline" }).click();

    await page.screenshot({
      fullPage: true,
      path: "test-results/playwright/timeline-zoom-review.png",
    });
  });

  test("captures fitted video area review state", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await selectLayer(page, "circle");

    await page.getByRole("button", { name: "Fit video area to visible stage" }).click();
    await saveShot(page, testInfo, "fit-video-area-review.png");
  });

  test("captures fitted video area with a tall timeline", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await selectLayer(page, "circle");

    const timeline = page.getByTestId("timeline");
    const timelineBounds = await timeline.boundingBox();
    if (!timelineBounds) {
      throw new Error("Timeline was not measurable.");
    }

    await page.mouse.move(timelineBounds.x + timelineBounds.width / 2, timelineBounds.y + 1);
    await page.mouse.down();
    await page.mouse.move(
      timelineBounds.x + timelineBounds.width / 2,
      timelineBounds.y - 140,
      { steps: 14 },
    );
    await page.mouse.up();

    await page.getByRole("button", { name: "Fit video area to visible stage" }).click();
    await saveShot(page, testInfo, "fit-video-area-tall-timeline-review.png");
  });

  test("captures a tall timeline playhead state", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await selectLayer(page, "circle");

    const timeline = page.getByTestId("timeline");
    const timelineBounds = await timeline.boundingBox();
    if (!timelineBounds) {
      throw new Error("Timeline was not measurable.");
    }

    await page.mouse.move(timelineBounds.x + timelineBounds.width / 2, timelineBounds.y + 1);
    await page.mouse.down();
    await page.mouse.move(
      timelineBounds.x + timelineBounds.width / 2,
      timelineBounds.y - 120,
      { steps: 12 },
    );
    await page.mouse.up();

    await saveShot(page, testInfo, "tall-timeline-playhead.png");
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

  test("captures a close-up of inspector number fields", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await buildDesignReviewState(page);
    await scrollSidePanel(page, 0);

    const inspector = page.getByTestId("canvas-side-panel");
    const transformSection = inspector.locator("section").first();
    await saveLocatorShot(transformSection, testInfo, "inspector-field-closeup.png");
  });

  test("captures a close-up of typography controls", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add text");
    await selectLayer(page, "text");
    await scrollSidePanel(page, 520);

    const inspector = page.getByTestId("canvas-side-panel");
    const typographySection = inspector.locator("section").nth(3);
    await saveLocatorShot(typographySection, testInfo, "typography-controls-closeup.png");
  });

  test("captures a close-up of selected canvas controls", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectLayer(page, "rectangle");

    const canvasContainer = page.locator("[data-canvas_container]");
    await saveLocatorShot(
      canvasContainer,
      testInfo,
      "selected-object-controls-closeup.png",
    );
  });

  test("captures a close-up of selected line controls", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add line");
    await selectLayer(page, "line");

    const canvasContainer = page.locator("[data-canvas_container]");
    await saveLocatorShot(
      canvasContainer,
      testInfo,
      "selected-line-controls-closeup.png",
    );
  });

  test("captures the export dropdown close-up", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await selectLayer(page, "rectangle");

    await page.getByRole("button", { name: EXPORT_VIDEO_LABEL }).hover();

    const exportPopover = page.getByText("Format").last();
    await expect(exportPopover).toBeVisible();
    await saveLocatorShot(
      page.getByTestId("canvas-side-panel"),
      testInfo,
      "export-dropdown-closeup.png",
    );
  });

  test("captures long layer names with hover controls", async ({ page }, testInfo) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await renameLayer(
      page,
      "rectangle",
      "marketing hero background rectangle with very long descriptive layer name",
    );

    const floatingLayersPanel = page.getByTestId("floating-layers-panel");
    const longLayerButton = floatingLayersPanel
      .getByRole("button", {
        name: /marketing hero background rectangle with very long descriptive layer name/,
      })
      .first();

    await longLayerButton.hover();
    await expect(
      floatingLayersPanel.getByRole("button", {
        name: /Delete marketing hero background rectangle with very long descriptive layer name/,
      }),
    ).toBeVisible();

    await saveLocatorShot(
      floatingLayersPanel.nth(1),
      testInfo,
      "long-layer-name-controls.png",
    );
  });
});

/** Escapes text for safe use inside a RegExp constructor. */
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
