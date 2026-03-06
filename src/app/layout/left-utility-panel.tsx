"use client";

/** Left Utility Panel.Tsx application layout. */
import { useState, type ReactNode } from "react";
import AIChatPanel from "../features/ai/ai-chat-panel";
import CanvasItemsList from "../features/canvas/items-list/canvas-items-list";

type LeftPanelTab = "chat" | "items";

type LeftUtilityPanelProps = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

/** Left utility panel with floating vertical rail and section cards. */
export function LeftUtilityPanel({
  isCollapsed,
  onToggleCollapsed,
}: LeftUtilityPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>("items");

  return (
    <aside
      data-objects
      className="h-full max-h-dvh items-stretch gap-2 border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)]  md:order-1 md:max-h-none md:border-r md:border-b-0"
    >
      <div className="h-full  shrink-0 border border-[rgba(255,255,255,0.14)] bg-[rgba(10,10,12,0.98)] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.42)]">
        <div className="flex h-full flex-col">
          <div className="space-y-1.5">
            <LeftRailButton
              active={activeTab === "items"}
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v3A1.5 1.5 0 0 1 18.5 10h-13A1.5 1.5 0 0 1 4 8.5v-3Zm0 10A1.5 1.5 0 0 1 5.5 14h13a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-3Z"
                    fill="currentColor"
                  />
                </svg>
              }
              label="Items"
              onClick={() => {
                setActiveTab("items");
              }}
            />
            <LeftRailButton
              active={activeTab === "chat"}
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M5 4a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2.4l3.6 3.2c.64.56 1.64.1 1.64-.75V17H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm1 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm4 1a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"
                    fill="currentColor"
                  />
                </svg>
              }
              label="Chat"
              onClick={() => {
                setActiveTab("chat");
              }}
            />
          </div>
          <div className="mt-auto flex justify-center pb-1">
            <span className="h-8 w-8 rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.03)] text-center text-[18px] leading-8 text-[#9ca3af]">
              ⋯
            </span>
          </div>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(12,12,15,0.92)] shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur transition-all ${
          isCollapsed
            ? "pointer-events-none w-0 opacity-0"
            : "w-auto opacity-100"
        }`}
      >
        <div className="h-full min-h-0 overflow-y-auto p-3">
          {isCollapsed ? null : activeTab === "items" ? (
            <CanvasItemsList />
          ) : (
            <AIChatPanel />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleCollapsed}
        className="my-auto -ml-1.5 -mr-1.5 z-10 inline-flex h-16 w-4 items-center justify-center rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(15,15,18,0.95)] text-[#9ca3af] shadow-[0_8px_18px_rgba(0,0,0,0.35)] hover:text-[#d1d5db]"
        aria-label={isCollapsed ? "Expand left panel" : "Collapse left panel"}
        title={isCollapsed ? "Expand panel" : "Collapse panel"}
      >
        <span className="text-xs leading-none">{isCollapsed ? "›" : "‹"}</span>
      </button>
    </aside>
  );
}

type LeftRailButtonProps = {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

/** Vertical rail button for left-panel section switching. */
function LeftRailButton({ active, icon, label, onClick }: LeftRailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center transition ${
        active
          ? "border-[var(--wise-accent)]/70 bg-[var(--wise-accent)]/16 text-[#e5e7eb]"
          : "border-transparent bg-[rgba(255,255,255,0.02)] text-[#9ca3af] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#d1d5db]"
      }`}
      aria-pressed={active}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}
