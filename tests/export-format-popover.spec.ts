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

test("allows selecting the WebM export format", async ({
  page,
}, testInfo) => {
  await gotoEditor(page);

  const exportButton = page.getByRole("button", { name: EXPORT_VIDEO_LABEL });
  await exportButton.hover();

  await expect(page.getByText("Format", { exact: true })).toBeVisible();

  const formatTrigger = page.getByRole("button", { name: "Select export format" });
  await expect(formatTrigger).toBeVisible();

  await formatTrigger.click();

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("export-format-popover-after-click.png"),
  });

  const webmOption = page.getByRole("menuitemradio", { name: "WebM" });
  await expect(webmOption).toBeVisible();
  await webmOption.click();

  await expect(page.getByRole("button", { name: "Select export format" })).toContainText(
    "WebM",
  );
});
