"use client";

/** Left Utility Panel.Tsx application layout. */
import CanvasItemsList from "../features/canvas/items-list/canvas-items-list";

/** Left utility panel hosting the canvas layers list. */
export function LeftUtilityPanel() {
  return (
    <aside
      data-objects
      className="flex min-h-0 h-full max-h-dvh flex-col items-stretch border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] md:order-1 md:max-h-none md:border-r md:border-b-0"
    >
      <div className="border-b border-[var(--wise-border)] px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c8c8c8]">
          Layers
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <CanvasItemsList />
      </div>
    </aside>
  );
}
