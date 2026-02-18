import { expect, test, type Page } from "@playwright/test";

const APP_URL = "http://localhost:5173/";

async function gotoEditor(page: Page) {
  // Open app root and wait for core editor regions to render.
  await page.goto(APP_URL);
  await expect(
    page.getByRole("heading", { name: "Canvas Items" }),
  ).toBeVisible();
  await expect(page.getByText("AI Scene Chat")).toBeVisible();
  await expect(page.getByTestId("timeline")).toBeVisible();
}

async function addCanvasItem(page: Page, label: string) {
  // Add an item through the floating add-tool controls.
  await page.getByRole("button", { name: label }).click();
}

async function selectCanvasListItem(page: Page, name: string) {
  // Select an item by name from the canvas items list.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page
    .getByRole("button", { name: new RegExp(`^${escaped}$`) })
    .first()
    .click();
}

test.describe("Motion Editor E2E", () => {
  test("renders main layout and controls", async ({ page }) => {
    // Verify shell layout and key controls.
    await gotoEditor(page);
    await expect(
      page.getByRole("button", { name: "Export MP4" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Design" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Animations" }),
    ).toBeVisible();
  });

  test("adds canvas items and reflects them in timeline/list", async ({
    page,
  }) => {
    // Ensure add tools create items visible in both list and timeline.
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await addCanvasItem(page, "Add text");

    await expect(page.getByText("rectangle", { exact: true })).toBeVisible();
    await expect(page.getByText("circle", { exact: true })).toBeVisible();
    await expect(page.getByText("text", { exact: true })).toBeVisible();
    await expect(
      page.getByTestId("timeline").getByText("rectangle"),
    ).toBeVisible();
  });

  test("masking can be undone/redone from history controls", async ({
    page,
  }) => {
    // Validate masking state transitions through undo/redo.
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await addCanvasItem(page, "Add circle");
    await selectCanvasListItem(page, "rectangle");

    const maskingSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Masking" }) })
      .first();
    const maskSelect = maskingSection.getByRole("combobox");
    await maskSelect.selectOption({ label: "circle" });
    await expect(maskSelect).toHaveValue(/circle/);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(maskSelect).toHaveValue("none");
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(maskSelect).toHaveValue(/circle/);
  });

  test("transform edit adds keyframe markers", async ({ page }) => {
    // Editing transform fields should increase keyframe count for the item.
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectCanvasListItem(page, "rectangle");

    const transformSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Transform" }) })
      .first();
    const positionXField = transformSection.getByRole("spinbutton", {
      name: "Position X",
    });
    await positionXField.fill("420");
    await positionXField.blur();

    await expect(page.locator('button[title^="rectangle @"]')).toHaveCount(2);
  });

  test("color picker closes on outside click", async ({ page }) => {
    // Fill color picker should dismiss when clicking outside its section.
    await gotoEditor(page);
    await addCanvasItem(page, "Add rectangle");
    await selectCanvasListItem(page, "rectangle");

    const fillLabel = page
      .locator("label")
      .filter({ hasText: /^Fill$/ })
      .first();
    await fillLabel.locator("button").click();
    await expect(page.locator(".react-colorful").first()).toBeVisible();

    await page
      .getByRole("button", { name: "Export MP4" })
      .click({ force: true });
    await expect(page.locator(".react-colorful").first()).toBeHidden();
  });
});
