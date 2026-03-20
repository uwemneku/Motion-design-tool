/** Add File Buttons.Tsx reusable UI component. */
import { ImagePlus } from "lucide-react";
import { useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ToolButton } from "./tool-button";

type ButtonMouseDown = (event: MouseEvent<HTMLButtonElement>) => void;

type AddFileButtonsProps = {
  onAddImageFile: (file: File) => void | Promise<void>;
  onAddSvgFile: (file: File) => void | Promise<void>;
  onAddVideoFile: (file: File) => void | Promise<void>;
  onMouseDown: ButtonMouseDown;
};

/**
 * Tool button that opens one asset picker and prompts for SVG import mode.
 */
export function AddAssetButton({
  onAddImageFile,
  onAddSvgFile,
  onAddVideoFile,
  onMouseDown,
}: AddFileButtonsProps) {
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSvgFile, setPendingSvgFile] = useState<File | null>(null);

  const isSvgFile = (file: File) =>
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

  const isVideoFile = (file: File) => file.type.startsWith("video/");

  const clearPendingSvg = () => {
    setPendingSvgFile(null);
  };

  const onAssetSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (isSvgFile(file)) {
      setPendingSvgFile(file);
      return;
    }

    if (isVideoFile(file)) {
      void onAddVideoFile(file);
      return;
    }

    void onAddImageFile(file);
  };

  return (
    <>
      <ToolButton
        label="Import assets"
        onClick={() => {
          assetInputRef.current?.click();
        }}
        onMouseDown={onMouseDown}
      >
        <ImagePlus className="size-4" strokeWidth={2} aria-hidden />
      </ToolButton>
      <input
        ref={assetInputRef}
        type="file"
        accept="image/*,video/*,.svg,image/svg+xml"
        onChange={onAssetSelected}
        className="hidden"
      />

      {pendingSvgFile && typeof document !== "undefined"
          ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="svg-import-title"
              onClick={clearPendingSvg}
            >
              <div
                className="w-full max-w-sm rounded-xl border border-white/10 bg-[rgba(28,28,31,0.98)] p-4 shadow-[0_24px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <div className="space-y-1">
                  <h2
                    id="svg-import-title"
                    className="font-[var(--wise-font-display)] text-sm font-semibold text-[#f3f5f8]"
                  >
                    Import SVG
                  </h2>
                  <p className="text-[12px] leading-5 text-[var(--wise-content-secondary)]">
                    How would you like to import this SVG?
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-3 py-2 text-left text-[12px] font-medium text-[#f3f5f8] transition hover:bg-[var(--wise-surface-muted)]"
                    onClick={() => {
                      void onAddImageFile(pendingSvgFile);
                      clearPendingSvg();
                    }}
                  >
                    Import as image
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-3 py-2 text-left text-[12px] font-medium text-[#f3f5f8] transition hover:bg-[var(--wise-surface-muted)]"
                    onClick={() => {
                      void onAddSvgFile(pendingSvgFile);
                      clearPendingSvg();
                    }}
                  >
                    Import as SVG
                  </button>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-md px-2.5 py-1.5 text-[12px] text-[var(--wise-content-secondary)] transition hover:bg-white/5 hover:text-[#f3f5f8]"
                    onClick={clearPendingSvg}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
