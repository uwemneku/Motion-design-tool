import path from "node:path";
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

/** Adds a canvas item through the floating tool dock. */
async function addCanvasItem(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
}

/** Selects a layer row from the floating layers panel. */
async function selectLayer(page: Page, name: string) {
  await page
    .getByTestId("floating-layers-panel")
    .last()
    .getByRole("button", { name: new RegExp(`^${escapeRegex(name)}$`) })
    .click();
}

/** Returns the main design input associated with a visible label. */
function getLabeledInput(page: Page, label: string) {
  return page
    .locator("label")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("input")
    .first();
}

/** Moves the main timeline playhead to a relative horizontal position. */
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

/** Returns the current top-to-bottom layer order from the floating panel. */
async function getLayerOrder(page: Page) {
  return page
    .getByTestId("floating-layers-panel")
    .last()
    .locator('button[title="Drag to reorder"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute("aria-label") ?? "")
        .map((label) => label.replace(/^Drag /, "")),
    );
}

/** Reorders layers by dragging one visible handle onto another. */
async function dragLayerHandle(page: Page, fromIndex: number, toIndex: number) {
  const handles = page
    .getByTestId("floating-layers-panel")
    .last()
    .locator('button[title="Drag to reorder"]');
  const sourceBox = await handles.nth(fromIndex).boundingBox();
  const targetBox = await handles.nth(toIndex).boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Layer drag handles were not measurable.");
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
}

test.describe("Editor behavior", () => {
  test("supports core add, select, edit, keyframe, and timeline workflows", async ({
    page,
  }) => {
    await gotoEditor(page);

    await expect(page.getByText("No items yet")).toBeVisible();

    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await addCanvasItem(page, "Add text");

    const layersPanel = page.getByTestId("floating-layers-panel").last();
    await expect(layersPanel).toBeVisible();
    await expect(
      layersPanel.getByRole("button", { name: "rectangle", exact: true }),
    ).toBeVisible();
    await expect(
      layersPanel.getByRole("button", { name: "circle", exact: true }),
    ).toBeVisible();
    await expect(
      layersPanel.getByRole("button", { name: "text", exact: true }),
    ).toBeVisible();

    await selectLayer(page, "rectangle");

    const positionXInput = getLabeledInput(page, "Position X");
    await expect(positionXInput).toBeVisible();

    await positionXInput.fill("240");
    await positionXInput.press("Enter");
    await expect(positionXInput).toHaveValue("240");

    await seekTimeline(page, 0.5);
    await page.getByRole("button", { name: "Add keyframe for Position X" }).click();
    await expect(
      page.getByTitle(/rectangle animation 0\.00s - 5\.00s/),
    ).toBeVisible();

    const zoomLabel = page.getByText("100%");
    await expect(zoomLabel).toBeVisible();
    await page.getByRole("button", { name: "Zoom in timeline" }).click();
    await expect(page.getByText("125%")).toBeVisible();

    await page.getByRole("button", { name: "Zoom out timeline" }).click();
    await expect(page.getByText("100%")).toBeVisible();

    await selectLayer(page, "rectangle");
    await page.keyboard.press("Backspace");
    await expect(
      page
        .getByTestId("floating-layers-panel")
        .last()
        .getByRole("button", { name: "rectangle", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Select an item to edit properties."),
    ).toBeVisible();
  });

  test("starts number scrubbing from the latest typed value", async ({
    page,
  }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectLayer(page, "rectangle");

    const scrubHandle = page.getByRole("button", { name: "Adjust X" }).first();
    const positionXInput = scrubHandle.locator("..").locator("input");
    await positionXInput.fill("240");
    await positionXInput.press("Enter");
    await expect(positionXInput).toHaveValue("240");

    const handleBox = await scrubHandle.boundingBox();
    if (!handleBox) {
      throw new Error("Position X scrub handle was not measurable.");
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 12,
      handleBox.y + handleBox.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();

    await expect(positionXInput).toHaveValue("252");
  });

  test("starts playback from the current scrubbed playhead position", async ({
    page,
  }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");

    await seekTimeline(page, 0.5);
    await expect(page.getByText("5.00")).toBeVisible();

    await page.getByRole("button", { name: "Play timeline" }).click();

    await expect
      .poll(async () => {
        const readout = page.locator('[title="Pause timeline"]').locator("..").getByText(/\d+\.\d{2}/).first();
        return readout.textContent();
      })
      .not.toBe("0.00");
  });

  test("keeps export and inspector controls reachable in the normal flow", async ({
    page,
  }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectLayer(page, "rectangle");

    await expect(page.getByRole("button", { name: "Design", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anim", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Redo" })).toBeVisible();

    await page.getByRole("button", { name: EXPORT_VIDEO_LABEL }).hover();
    await expect(page.getByRole("button", { name: "Select export format" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select export format" })).toContainText(
      "MP4",
    );
  });

  test("allows changing the export format from the export menu", async ({ page }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectLayer(page, "rectangle");

    await page.getByRole("button", { name: EXPORT_VIDEO_LABEL }).hover();
    const exportPanel = page.getByText("Format").last().locator("..");

    const formatTrigger = exportPanel.getByRole("button", {
      name: "Select export format",
    });
    await expect(formatTrigger).toBeVisible();
    await expect(formatTrigger).toContainText("MP4");

    await formatTrigger.click();
    await page.getByRole("menuitemradio", { name: "WebM" }).click();

    await expect(formatTrigger).toContainText("WebM");
  });

  test("keeps the design panel scrollable and places the color picker left of the inspector", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoEditor(page);
    await addCanvasItem(page, "Add text");
    await selectLayer(page, "text");

    const panel = page.getByTestId("canvas-side-panel");
    const scrollContainer = panel.locator("[data-container]");
    const fillPickerTrigger = page.getByRole("button", {
      name: "Open fill picker",
    });

    await fillPickerTrigger.click();

    const popover = page.getByTestId("design-color-popover");
    await expect(popover).toBeVisible();

    const panelBox = await panel.boundingBox();
    const popoverBox = await popover.boundingBox();
    if (!panelBox || !popoverBox) {
      throw new Error("Color picker or side panel was not measurable.");
    }

    expect(popoverBox.x + popoverBox.width).toBeLessThanOrEqual(panelBox.x + 1);

    const scrollTopBefore = await scrollContainer.evaluate(
      (element) => element.scrollTop,
    );
    await scrollContainer.hover();
    await page.mouse.wheel(0, 320);

    await expect
      .poll(
        async () =>
          scrollContainer.evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(scrollTopBefore);
  });

  test("supports svg and bitmap imports", async ({
    page,
  }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await addCanvasItem(page, "Add text");

    const initialOrder = await getLayerOrder(page);
    expect(initialOrder).toEqual(["text", "circle", "rectangle"]);

    const svgInput = page.locator('input[type="file"]').nth(0);
    await svgInput.setInputFiles(
      path.resolve("src/assets/react.svg"),
    );

    await expect
      .poll(async () => (await getLayerOrder(page)).length)
      .toBeGreaterThan(initialOrder.length);

    const orderAfterSvgImport = await getLayerOrder(page);

    const imageInput = page.locator('input[type="file"]').nth(1);
    await imageInput.setInputFiles(
      path.resolve(
        "tests/editor-visual.spec.ts-snapshots/editor-shell-baseline-chromium-darwin.png",
      ),
    );

    await expect
      .poll(async () => (await getLayerOrder(page)).length)
      .toBeGreaterThan(orderAfterSvgImport.length);

    await expect(await getLayerOrder(page)).toContain("image");
  });

  test.fixme("reorders layers from the floating drag handles", async ({
    page,
  }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await addCanvasItem(page, "Add text");

    const orderBeforeReorder = await getLayerOrder(page);
    await dragLayerHandle(page, orderBeforeReorder.length - 1, 0);

    await expect
      .poll(async () => JSON.stringify(await getLayerOrder(page)))
      .not.toBe(JSON.stringify(orderBeforeReorder));
  });

  test("exports the current scene as a downloadable video", async ({ page }) => {
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");

    const downloadPromise = page.waitForEvent("download", {
      timeout: 60_000,
    });
    await page.getByRole("button", { name: EXPORT_VIDEO_LABEL }).click();

    await expect(
      page.getByRole("status", { name: "Export in progress" }),
    ).toBeVisible();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^motion-export-.*\.mp4$/);
  });
});

/** Escapes text for safe use in RegExp-based Playwright selectors. */
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
