/** Index.Tsx canvas side panel UI logic. */
import { useMemo, useState } from "react";
import { useAppSelector } from "../../../store";
import CanvasHistoryControls from "../canvas-header/canvas-history-controls";
import CanvasSidePanelAnimations from "./animations";
import CanvasSidePanelDesign from "./design";
import { CanvasSidePanelExportControls } from "./export-controls";
import { KeyframeDetailsPanel } from "./keyframe-details";

export type PanelTab = "design" | "animations";

/** Right-side inspector panel for design edits and animation templates. */
export default function CanvasSidePanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("design");
  const selectedId = useAppSelector((state) => state.editor.selectedId);
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
    <aside className="pointer-events-auto flex h-full max-h-full w-[240px] max-w-[240px] min-w-[240px] shrink-0 flex-col overflow-hidden border-l border-[var(--wise-border)] bg-[rgba(12,12,15,0.96)]">
      <div className="border-b border-[var(--wise-border)] bg-[rgba(255,255,255,0.02)] ">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <CanvasHistoryControls />
          <CanvasSidePanelExportControls />
        </div>
        <div className=" border-t border-[var(--wise-border)]" />
        <div className=" grid grid-cols-2 border-t border-[var(--wise-border)]">
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
          className="min-h-0 h-full max-h-full overflow-y-auto px-2.5 py-3"
          data-container
        >
          <div className="space-y-3">
            {activeTab === "design" ? (
              <CanvasSidePanelDesign />
            ) : (
              <CanvasSidePanelAnimations
                canApplyAnimation={canApplyAnimation}
                keyframeTimesText={keyframeTimesText}
              />
            )}
            <KeyframeDetailsPanel />
          </div>
        </div>
      </div>
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
      className={`group flex h-10 w-full items-center justify-center gap-1.5 px-2.5 text-sm font-medium transition ${
        active
          ? "bg-[rgba(37,99,235,0.18)] text-[#e5e7eb] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.04)]"
          : "text-[#9ca3af] hover:bg-white/5 hover:text-[#d1d5db]"
      }`}
      aria-pressed={active}
    >
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}
