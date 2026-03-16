/** Index.Tsx canvas side panel UI logic. */
import { useMemo, useState } from "react";
import { useAppSelector } from "../../../store";
import CanvasSidePanelAnimations from "./animations";
import CanvasSidePanelDesign from "./design";
import { CanvasSidePanelExportControls } from "./export-controls";
import { KeyframeDetailsPanel } from "./keyframe-details";

export type PanelTab = "design" | "animations";

type CanvasSidePanelProps = {
  floating?: boolean;
  showToolbar?: boolean;
};

/** Right-side inspector panel for design edits and animation templates. */
export default function CanvasSidePanel({
  floating = false,
  showToolbar = true,
}: CanvasSidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("design");
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const selectedId = selectedIds[0] ?? null;
  const selectedItem = useAppSelector((state) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );

  const canApplyAnimation = Boolean(selectedId && selectedItem);

  const keyframeTimesText = useMemo(() => {
    if (!selectedItem || selectedItem.keyframe.length === 0) return null;
    return selectedItem.keyframe.map((frame) => `t=${frame.timestamp.toFixed(2)}s`).join(" • ");
  }, [selectedItem]);

  return (
    <aside
      data-testid="canvas-side-panel"
      className={`pointer-events-auto border-l flex h-full max-h-full w-[240px] max-w-[240px] min-w-[240px] shrink-0 flex-col overflow-hidden ${
        floating
          ? " border-white/8 bg-[rgba(42,42,44,0.9)] shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
          : " border-[var(--wise-border)] bg-[rgba(35,35,37,0.98)]"
      }`}
    >
      <div className="shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))]">
        <div
          className={`flex items-center gap-2 px-2 py-2 ${showToolbar ? " border-white/8" : ""}`}
        >
          <PanelTabButton
            active={activeTab === "design"}
            label="Design"
            onClick={() => {
              setActiveTab("design");
            }}
          />
          <PanelTabButton
            active={activeTab === "animations"}
            label="Animation"
            onClick={() => {
              setActiveTab("animations");
            }}
          />
          {showToolbar ? (
            <div className="flex items-center justify-end gap-2 flex-1">
              <CanvasSidePanelExportControls />
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 h-full max-h-full overflow-y-auto px-2.5 py-2.5" data-container>
          <div className="space-y-2.5 pb-3">
            {activeTab === "design" ? (
              <CanvasSidePanelDesign />
            ) : (
              <CanvasSidePanelAnimations
                canApplyAnimation={canApplyAnimation}
                keyframeTimesText={keyframeTimesText}
              />
            )}
          </div>
        </div>
      </div>
      <KeyframeDetailsPanel />
    </aside>
  );
}

type PanelTabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

/** Top tab-style button used to switch between inspector sections. */
function PanelTabButton({ active, label, onClick }: PanelTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-6 items-center justify-center gap-1.5 px-2.5 font-medium transition ${
        active
          ? "rounded-[5px] bg-[rgba(255,255,255,0.12)] text-[#f3f4f6]"
          : "rounded-[5px] text-[#b7bbc3] hover:bg-white/5 hover:text-[#f3f4f6]"
      }`}
      aria-pressed={active}
    >
      <span className="text-[10px] font-semibold tracking-[0.02em]">{label}</span>
    </button>
  );
}
