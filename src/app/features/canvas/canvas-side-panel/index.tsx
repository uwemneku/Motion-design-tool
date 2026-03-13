/** Index.Tsx canvas side panel UI logic. */
import { useMemo, useState } from "react";
import { useAppSelector } from "../../../store";
import CanvasHistoryControls from "../canvas-header/canvas-history-controls";
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
    return selectedItem.keyframe
      .map((frame) => `t=${frame.timestamp.toFixed(2)}s`)
      .join(" • ");
  }, [selectedItem]);

  return (
    <aside
      className={`pointer-events-auto border-l flex h-full max-h-full w-[240px] max-w-[240px] min-w-[240px] shrink-0 flex-col overflow-hidden ${
        floating
          ? " border-white/10 bg-[rgba(16,20,28,0.72)] shadow-[0_16px_34px_rgba(0,0,0,0.26)] backdrop-blur-2xl"
          : " border-[var(--wise-border)] bg-[rgba(12,12,15,0.96)]"
      }`}
    >
      <div className="shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]">
        {showToolbar ? (
          <>
            <div className="flex items-center justify-between gap-2 px-2.5 py-2.5">
              <CanvasHistoryControls />
              <CanvasSidePanelExportControls />
            </div>
            <div className="border-t border-white/10" />
          </>
        ) : null}
        <div
          className={`grid grid-cols-2 ${
            showToolbar ? "border-t border-white/10" : ""
          }`}
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
            label="Anim"
            onClick={() => {
              setActiveTab("animations");
            }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="min-h-0 h-full max-h-full overflow-y-auto px-2.5 py-2.5"
          data-container
        >
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
      className={`group flex h-8 w-full items-center justify-center gap-1.5 px-2 text-sm font-medium transition ${
        active
          ? "bg-[rgba(10,132,255,0.18)] text-[#f5f7fb] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]"
          : "text-[#aab6c8] hover:bg-white/5 hover:text-[#eef4ff]"
      }`}
      aria-pressed={active}
    >
      <span className="text-[10px] font-semibold tracking-[0.02em]">
        {label}
      </span>
    </button>
  );
}
