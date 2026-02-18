export const MASK_HISTORY_EVENT_NAME = "canvas-mask-history";

export type MaskHistoryEventDetail = {
  targetId: string;
  previousSourceId: string;
  nextSourceId: string;
};

export function emitMaskHistoryEvent(detail: MaskHistoryEventDetail) {
  // Emit mask changes so editor history can register undo/redo entries.
  window.dispatchEvent(
    new CustomEvent<MaskHistoryEventDetail>(MASK_HISTORY_EVENT_NAME, {
      detail,
    }),
  );
}
