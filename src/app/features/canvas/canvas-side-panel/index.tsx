import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { type RootState } from "../../../store";
import type { PanelTab } from "./types";
import CanvasSidePanelDesign from "./design";
import CanvasSidePanelAnimations from "./animations";

export default function CanvasSidePanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("design");
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const selectedItem = useSelector((state: RootState) =>
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
    <aside className="flex max-h-[34vh] w-full shrink-0 flex-col overflow-hidden border-t border-[var(--wise-border)] bg-[var(--wise-surface-raised)]/95 xl:h-full xl:max-h-none xl:w-72 xl:border-t-0 xl:border-l">
      <div className="flex border-[var(--wise-border)] bg-[var(--wise-surface)] p-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("design");
          }}
          className={`flex-1 rounded px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
            activeTab === "design"
              ? "bg-[var(--wise-accent)] text-[#edf2ff]"
              : "text-[#a8a8a8] hover:text-[#e2e2e2]"
          }`}
        >
          Design
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("animations");
          }}
          className={`flex-1 rounded px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
            activeTab === "animations"
              ? "bg-[var(--wise-accent)] text-[#edf2ff]"
              : "text-[#a8a8a8] hover:text-[#e2e2e2]"
          }`}
        >
          Animations
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 xl:p-3">
        <div className="space-y-4">
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
    </aside>
  );
}
