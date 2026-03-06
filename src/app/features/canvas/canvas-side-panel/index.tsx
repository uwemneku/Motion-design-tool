/** Index.Tsx canvas side panel UI logic. */
import { type ReactNode, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { type RootState } from '../../../store';
import CanvasSidePanelAnimations from './animations';
import CanvasSidePanelDesign from './design';
import { KeyframeDetailsPanel } from './keyframe-details';

export type PanelTab = 'design' | 'animations';

/** Right-side inspector panel for design edits and animation templates. */
export default function CanvasSidePanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>('design');
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const selectedItem = useSelector((state: RootState) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );

  const canApplyAnimation = Boolean(selectedId && selectedItem);

  const keyframeTimesText = useMemo(() => {
    if (!selectedItem || selectedItem.keyframe.length === 0) return null;
    return selectedItem.keyframe
      .map((frame) => `t=${frame.timestamp.toFixed(2)}s`)
      .join(' • ');
  }, [selectedItem]);

  return (
    <aside className="pointer-events-auto flex h-full max-h-full w-[320px] min-w-[260px] shrink-0 flex-col overflow-hidden border-l border-[var(--wise-border)] bg-[rgba(12,12,15,0.96)]">
      <div className="border-b border-[var(--wise-border)] bg-[rgba(255,255,255,0.02)] px-2.5 py-2">
        <div className="mb-2 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d1d5db]">
            Inspector
          </h2>
          <p className="text-[11px] text-[#9ca3af]">Design, animation, keyframes</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PanelTabButton
            active={activeTab === "design"}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Zm3-1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7Zm-3 11a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"
                  fill="currentColor"
                />
              </svg>
            }
            label="Design"
            onClick={() => {
              setActiveTab("design");
            }}
          />
          <PanelTabButton
            active={activeTab === "animations"}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 6a2 2 0 0 1 2-2h2a1 1 0 1 1 0 2H6v2a1 1 0 1 1-2 0V6Zm14-2h2a2 2 0 0 1 2 2v2a1 1 0 1 1-2 0V6h-2a1 1 0 1 1 0-2ZM4 16a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2H6a2 2 0 0 1-2-2v-2a1 1 0 0 1 1-1Zm16 0a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-1a1 1 0 1 1 0-2h1v-2a1 1 0 0 1 1-1ZM8 8h8v8H8V8Z"
                  fill="currentColor"
                />
              </svg>
            }
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
            {activeTab === "design" ? <CanvasSidePanelDesign /> : (
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
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

/** Top tab-style button used to switch between inspector sections. */
function PanelTabButton({
  active,
  icon,
  label,
  onClick,
}: PanelTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition ${
        active
          ? "border-[var(--wise-accent)]/70 bg-[var(--wise-accent)]/16 text-[#e5e7eb]"
          : "border-white/10 bg-[rgba(255,255,255,0.02)] text-[#9ca3af] hover:border-white/20 hover:bg-white/5 hover:text-[#d1d5db]"
      }`}
      aria-pressed={active}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}
