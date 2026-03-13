import { useCallback, useEffect, useRef } from "react";
import {
  CANVAS_KEYFRAME_EPSILON,
  KEYFRAME_SECTION_HORIZONTAL_PADDING,
} from "../../../../const";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setPlayheadTime,
  setSelectedId,
  setSelectedKeyframe,
  upsertItemRecord,
} from "../../../store/editor-slice";
import type { AnimatableObject } from "../../shapes/animatable-object/object";
import type {
  ColorKeyframe,
  Keyframe,
} from "../../shapes/animatable-object/types";
import { rgbaBytesToCss } from "../../shapes/animatable-object/util";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

type DetailEntry = {
  keyframeId: string;
  property: string;
  time: number;
  text: string;
};

type DragState = {
  keyframeId: string;
  property: string;
  time: number;
  trackElement: HTMLDivElement;
  viewportElement: HTMLElement | null;
  didMove: boolean;
  startClientX: number;
  startClientY: number;
};

type TimelineItemPropertyRowProps = {
  itemId: string;
  label: string;
  property: string;
  valueType: "color" | "number";
  timelineDuration: number;
};

const EDGE_AUTO_SCROLL_ZONE_PX = 40;
const EDGE_AUTO_SCROLL_STEP_PX = 24;
const DRAG_START_THRESHOLD_PX = 4;

/** Renders one nested property timeline row and owns its keyframe interactions. */
export function TimelineItemPropertyRow({
  itemId,
  label,
  property,
  valueType,
  timelineDuration,
}: TimelineItemPropertyRowProps) {
  const dispatch = useAppDispatch();
  const { getObjectById } = useCanvasAppContext();
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const itemRecord = useAppSelector(
    (state) => state.editor.itemsRecord[itemId] ?? null,
  );
  const selectedKeyframe = useAppSelector(
    (state) => state.editor.selectedKeyframe,
  );
  const entries = getDetailEntries({
    getObjectById,
    itemId,
    property,
    valueType,
  });

  /** Updates the editor playhead using normalized timeline precision. */
  const seekToTime = useCallback(
    (time: number) => {
      dispatch(setPlayheadTime(Number(time.toFixed(3))));
    },
    [dispatch],
  );

  /** Selects a specific property keyframe entry in the expanded details view. */
  const selectKeyframe = (entry: DetailEntry) => {
    seekToTime(entry.time);
    dispatch(setSelectedId([itemId]));
    dispatch(
      setSelectedKeyframe({
        itemId,
        keyframeId: entry.keyframeId,
        property: entry.property,
        timestamp: entry.time,
      }),
    );
  };

  useEffect(() => {
    /** Moves the active nested property keyframe while dragging across the timeline. */
    const handlePointerMove = (event: globalThis.MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || !itemRecord) return;

      const pointerDistance = Math.hypot(
        event.clientX - dragState.startClientX,
        event.clientY - dragState.startClientY,
      );
      if (!dragState.didMove && pointerDistance < DRAG_START_THRESHOLD_PX) {
        return;
      }

      const trackBounds = dragState.trackElement.getBoundingClientRect();
      const trackStyles = window.getComputedStyle(dragState.trackElement);
      const paddingLeft = Number.parseFloat(trackStyles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(trackStyles.paddingRight) || 0;
      const trackWidth = Math.max(
        0,
        trackBounds.width - paddingLeft - paddingRight,
      );
      if (trackWidth <= 0) return;

      event.preventDefault();
      autoScrollTimelineViewport(dragState.viewportElement, event.clientX);

      const nextX = clamp(
        event.clientX - trackBounds.left - paddingLeft,
        0,
        trackWidth,
      );
      const nextTime = Number(
        ((nextX / trackWidth) * timelineDuration).toFixed(3),
      );
      if (Math.abs(nextTime - dragState.time) <= CANVAS_KEYFRAME_EPSILON) {
        return;
      }

      const instance = getObjectById(itemId);
      if (!instance) return;

      moveKeyframeById(instance, dragState.keyframeId, nextTime);
      instance.seek(nextTime);
      instance.fabricObject.canvas?.requestRenderAll();

      dispatch(
        upsertItemRecord({
          id: itemId,
          value: {
            ...itemRecord,
            keyframe: instance
              .getTimelineMarkers()
              .map((marker) => ({
                id: marker.id,
                timestamp: marker.time,
              }))
              .sort((left, right) => left.timestamp - right.timestamp),
          },
        }),
      );
      dispatch(
        setSelectedKeyframe({
          itemId,
          keyframeId: dragState.keyframeId,
          property: dragState.property,
          timestamp: nextTime,
        }),
      );
      seekToTime(nextTime);

      dragState.didMove = true;
      dragState.time = nextTime;
    };

    /** Finalizes a nested property drag and suppresses the trailing click event. */
    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      suppressClickRef.current = dragState.didMove;
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [
    dispatch,
    getObjectById,
    itemId,
    itemRecord,
    seekToTime,
    timelineDuration,
  ]);

  const minimumKeyframesToHideRows = [""].includes(property) ? 0 : 2;

  if (entries.length < minimumKeyframesToHideRows) return null;

  return (
    <div className="grid grid-cols-[210px_1fr] border-b border-[var(--wise-border)] last:border-b-0">
      <div className="sticky left-0 z-20 border-r border-[var(--wise-border)] bg-[var(--wise-surface)] px-3 py-2 pl-8 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div
        className="py-2"
        style={{
          paddingLeft: KEYFRAME_SECTION_HORIZONTAL_PADDING,
          paddingRight: KEYFRAME_SECTION_HORIZONTAL_PADDING,
        }}
      >
        <div
          className="relative h-6 rounded border border-[var(--wise-border)]"
          style={{
            background:
              "repeating-linear-gradient(45deg, #2c2c2c, #2c2c2c 16px, #1f1f1f 16px, #1f1f1f 32px)",
          }}
        >
          {entries.map((entry, index) => {
            const left = clamp((entry.time / timelineDuration) * 100, 0, 100);
            const isSelectedEntry =
              selectedKeyframe?.itemId === itemId &&
              selectedKeyframe.keyframeId === entry.keyframeId;
            const isLockedAtStart = entry.time <= CANVAS_KEYFRAME_EPSILON;

            return (
              <button
                type="button"
                key={`${label}-${entry.time}-${index}`}
                className={`absolute top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full border transition ${
                  isSelectedEntry
                    ? "size-3 border-[#2563eb] bg-[var(--wise-accent)] shadow-[0_0_0_1px_rgba(37,99,235,0.35)]"
                    : "size-2 border-[#e5e7eb] bg-[var(--wise-accent)]"
                } ${isLockedAtStart ? "cursor-default opacity-75" : "cursor-ew-resize"}`}
                style={{ left: `${left}%` }}
                title={`${label} @ ${entry.time.toFixed(2)}s • ${entry.text}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectKeyframe(entry);

                  if (isLockedAtStart) return;

                  dragStateRef.current = {
                    keyframeId: entry.keyframeId,
                    property: entry.property,
                    time: entry.time,
                    trackElement: event.currentTarget
                      .parentElement as HTMLDivElement,
                    viewportElement: event.currentTarget.closest(
                      ".timeline-scroll-viewport",
                    ),
                    didMove: false,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                  };
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  selectKeyframe(entry);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatValue(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

/** Reads the latest keyframe entries for a single property from the canvas object. */
function getDetailEntries({
  getObjectById,
  itemId,
  property,
  valueType,
}: {
  getObjectById: (id: string) => AnimatableObject | undefined;
  itemId: string;
  property: string;
  valueType: "color" | "number";
}): DetailEntry[] {
  const instance = getObjectById(itemId);
  if (!instance) return [];

  if (valueType === "color") {
    const frames = (instance.colorKeyframes[
      property as keyof typeof instance.colorKeyframes
    ] ?? []) as ColorKeyframe[];
    return frames
      .map((frame) => ({
        keyframeId: frame.id,
        property,
        time: frame.time,
        text: rgbaBytesToCss(frame.value),
      }))
      .sort((left, right) => left.time - right.time);
  }

  const frames = (instance.keyframes[
    property as keyof typeof instance.keyframes
  ] ?? []) as Keyframe[];
  return frames
    .map((frame) => ({
      keyframeId: frame.id,
      property,
      time: frame.time,
      text: formatValue(frame.value),
    }))
    .sort((left, right) => left.time - right.time);
}

/** Moves only the targeted keyframe id and keeps each property timeline sorted. */
function moveKeyframeById(
  instance: AnimatableObject,
  keyframeId: string,
  nextTime: number,
) {
  for (const frames of Object.values(instance.keyframes)) {
    if (!frames) continue;
    const matchingFrame = frames.find((frame) => frame.id === keyframeId);
    if (!matchingFrame) continue;
    matchingFrame.time = nextTime;
    frames.sort((left, right) => left.time - right.time);
    return;
  }

  for (const frames of Object.values(instance.colorKeyframes)) {
    if (!frames) continue;
    const matchingFrame = frames.find((frame) => frame.id === keyframeId);
    if (!matchingFrame) continue;
    matchingFrame.time = nextTime;
    frames.sort((left, right) => left.time - right.time);
    return;
  }
}

/** Scrolls the timeline viewport when the pointer nears either horizontal edge. */
function autoScrollTimelineViewport(
  viewportElement: HTMLElement | null,
  clientX: number,
) {
  if (!viewportElement) return;
  if (viewportElement.scrollWidth <= viewportElement.clientWidth) return;

  const bounds = viewportElement.getBoundingClientRect();
  const distanceToLeft = clientX - bounds.left;
  const distanceToRight = bounds.right - clientX;

  if (distanceToLeft < EDGE_AUTO_SCROLL_ZONE_PX) {
    viewportElement.scrollLeft = Math.max(
      0,
      viewportElement.scrollLeft - EDGE_AUTO_SCROLL_STEP_PX,
    );
    return;
  }

  if (distanceToRight < EDGE_AUTO_SCROLL_ZONE_PX) {
    const maxScrollLeft =
      viewportElement.scrollWidth - viewportElement.clientWidth;
    viewportElement.scrollLeft = Math.min(
      maxScrollLeft,
      viewportElement.scrollLeft + EDGE_AUTO_SCROLL_STEP_PX,
    );
  }
}

export type { DragState };
