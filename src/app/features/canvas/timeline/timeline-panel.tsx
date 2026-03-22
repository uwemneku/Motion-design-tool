/** Timeline Panel.Tsx timeline UI and behavior. */
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Resizable } from "re-resizable";
import { AppScrollArea } from "../../../components/app-scroll-area";
import {
  KEYFRAME_SECTION_HORIZONTAL_PADDING,
  LABEL_COLUMN_WIDTH,
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_DURATION,
  TIMELINE_LABEL_STEP,
  TIMELINE_MAX_HEIGHT,
  TIMELINE_MIN_HEIGHT,
} from "../../../../const";
import CanvasZoomControl from "../canvas-zoom-control";
import TimelineItemRow from "./timeline-item-row";
import TimelinePlayhead from "./timeline-playhead";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setPlayheadTime,
  setSelectedId,
  setSelectedKeyframes,
  type SelectedTimelineKeyframe,
} from "../../../store/editor-slice";
import TimeStampControl from "./timestamp-control";

const TIMELINE_ZOOM_MIN = 1;
const TIMELINE_ZOOM_MAX = 16;
const TIMELINE_ZOOM_STEP = 0.25;
const TIMELINE_TOOLBAR_HEIGHT = 48;
const TIMELINE_RULER_HEIGHT = 36;
const TIMELINE_ZOOM_SCALE_FACTOR = 3;
const MARQUEE_START_THRESHOLD_PX = 4;

type MarqueeDraft = {
  currentClientX: number;
  currentClientY: number;
  startClientX: number;
  startClientY: number;
};

type MarqueeSelectionBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

/** Timeline container with playback loop, labels, and item rows. */
export default function TimelinePanel() {
  const dispatch = useAppDispatch();
  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);
  const timelineDuration = useAppSelector(
    (state) => state.editor.projectInfo.durationSeconds,
  );

  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_DEFAULT_HEIGHT);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelectionBox | null>(null);
  const timelineContentRef = useRef<HTMLDivElement | null>(null);
  const marqueeDraftRef = useRef<MarqueeDraft | null>(null);
  const timelineZoomScale = 1 + (timelineZoom - TIMELINE_ZOOM_MIN) * TIMELINE_ZOOM_SCALE_FACTOR;
  const timelineDurationScale = Math.max(1, timelineDuration / TIMELINE_DURATION);
  const timelineLabelStep = getTimelineLabelStep(timelineZoom);
  const timelineContentWidth = `calc(${LABEL_COLUMN_WIDTH}px + (100% - ${LABEL_COLUMN_WIDTH}px) * ${timelineZoomScale * timelineDurationScale})`;
  const selectedKeyframes = useMemo(
    () => collectSelectedTimelineKeyframes(timelineContentRef.current, marqueeSelection),
    [marqueeSelection],
  );

  const seekFromPointer = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const styles = window.getComputedStyle(event.currentTarget);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const trackWidth = Math.max(0, bounds.width - paddingLeft - paddingRight);
      if (trackWidth <= 0) return;

      const x = clamp(event.clientX - bounds.left - paddingLeft, 0, trackWidth);
      const nextTime = (x / trackWidth) * timelineDuration;
      dispatch(setPlayheadTime(Number(nextTime.toFixed(3))));
    },
    [dispatch, timelineDuration],
  );

  useEffect(() => {
    /** Updates the marquee selection box while the pointer is dragging across keyframes. */
    const handlePointerMove = (event: globalThis.MouseEvent) => {
      const draft = marqueeDraftRef.current;
      const content = timelineContentRef.current;
      if (!draft || !content) return;

      draft.currentClientX = event.clientX;
      draft.currentClientY = event.clientY;

      const pointerDistance = Math.hypot(
        event.clientX - draft.startClientX,
        event.clientY - draft.startClientY,
      );
      if (pointerDistance < MARQUEE_START_THRESHOLD_PX) return;

      event.preventDefault();
      setMarqueeSelection(createMarqueeSelectionBox(content, draft));
    };

    /** Finalizes the marquee selection and syncs selected timeline keyframes into Redux. */
    const handlePointerUp = () => {
      const draft = marqueeDraftRef.current;
      marqueeDraftRef.current = null;

      if (!draft) {
        setMarqueeSelection(null);
        return;
      }

      if (selectedKeyframes.length > 0) {
        dispatch(setSelectedKeyframes(selectedKeyframes));
        dispatch(
          setSelectedId(Array.from(new Set(selectedKeyframes.map((keyframe) => keyframe.itemId)))),
        );
      } else if (marqueeSelection) {
        dispatch(setSelectedKeyframes([]));
      }

      setMarqueeSelection(null);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [dispatch, marqueeSelection, selectedKeyframes]);

  return (
    <section
      className="z-30 shrink-0 bg-[var(--wise-surface-panel)] focus-visible:outline-none"
      data-testid="timeline"
    >
      <Resizable
        size={{ width: "100%", height: timelineHeight }}
        minHeight={TIMELINE_MIN_HEIGHT}
        maxHeight={TIMELINE_MAX_HEIGHT}
        enable={{
          top: true,
          right: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        handleClasses={{
          top: "h-2 -top-1 cursor-row-resize bg-transparent hover:bg-[var(--wise-focus)]",
        }}
        onResizeStop={(_, __, ___, delta) => {
          setTimelineHeight((prev) =>
            clamp(prev + delta.height, TIMELINE_MIN_HEIGHT, TIMELINE_MAX_HEIGHT),
          );
        }}
      >
        <div
          className="bg-[var(--wise-surface-panel)]"
          data-testid="timeline-toolbar"
          style={{ height: TIMELINE_TOOLBAR_HEIGHT }}
        >
          <div className="relative flex h-full items-center justify-between px-3 py-2">
            <div className="relative z-10 flex items-center justify-start">
              <CanvasZoomControl />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto">
                <TimeStampControl />
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-end gap-1.5">
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-[4px] border border-[rgba(141,171,255,0.14)] bg-[var(--wise-surface-raised)] text-slate-300 transition hover:bg-[var(--wise-surface-muted)]"
                onClick={() => {
                  setTimelineZoom((prev) =>
                    clamp(
                      Number((prev - TIMELINE_ZOOM_STEP).toFixed(2)),
                      TIMELINE_ZOOM_MIN,
                      TIMELINE_ZOOM_MAX,
                    ),
                  );
                }}
                aria-label="Zoom out timeline"
                title="Zoom out timeline"
              >
                <span className="text-sm leading-none">-</span>
              </button>
              <span className="min-w-[3.5rem] text-center font-[var(--wise-font-display)] text-[10px] font-semibold tracking-[-0.01em] text-slate-400">
                {Math.round(timelineZoom * 100)}%
              </span>
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-[4px] border border-[rgba(141,171,255,0.14)] bg-[var(--wise-surface-raised)] text-slate-300 transition hover:bg-[var(--wise-surface-muted)]"
                onClick={() => {
                  setTimelineZoom((prev) =>
                    clamp(
                      Number((prev + TIMELINE_ZOOM_STEP).toFixed(2)),
                      TIMELINE_ZOOM_MIN,
                      TIMELINE_ZOOM_MAX,
                    ),
                  );
                }}
                aria-label="Zoom in timeline"
                title="Zoom in timeline"
              >
                <span className="text-sm leading-none">+</span>
              </button>
            </div>
          </div>
        </div>

        <AppScrollArea
          rootClassName="h-[calc(100%-48px)] overflow-hidden"
          viewportClassName="timeline-scroll-viewport h-full w-full"
          showHorizontalScrollbar
          showCorner
          horizontalScrollbarClassName="flex h-2.5 touch-none select-none border-t border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-0.5"
          verticalScrollbarClassName="flex w-2.5 touch-none select-none border-l border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-0.5"
          cornerClassName="bg-[var(--wise-surface-raised)]"
        >
          <div className="flex h-full w-full">
            <div
              className="relative flex h-full min-h-full w-full flex-col"
              ref={timelineContentRef}
              style={{
                minWidth: "100%",
                width: timelineContentWidth,
              }}
              onMouseDown={(event) => {
                const target = event.target as HTMLElement | null;
                if (!target) return;
                if (target.closest("[data-timeline-keyframe='true']")) return;
                dispatch(setSelectedKeyframes([]));
                if (!target.closest("[data-timeline-keyframe-track='true']")) return;

                marqueeDraftRef.current = {
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  currentClientX: event.clientX,
                  currentClientY: event.clientY,
                };
              }}
            >
              <TimelinePlayhead
                duration={timelineDuration}
                keyframeSectionOffset={LABEL_COLUMN_WIDTH + KEYFRAME_SECTION_HORIZONTAL_PADDING}
                keyframeSectionRightOffset={KEYFRAME_SECTION_HORIZONTAL_PADDING}
                rulerHeight={TIMELINE_RULER_HEIGHT}
              />

              <div className="sticky top-0 z-20 grid grid-cols-[210px_1fr] border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] text-xs font-medium text-slate-200">
                <div
                  data-item
                  className="sticky bg-inherit left-0 z-30 flex items-center  border-r border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-3"
                  style={{ height: TIMELINE_RULER_HEIGHT }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Layers
                  </div>
                </div>
                <div
                  className="relative cursor-pointer"
                  onClick={seekFromPointer}
                  title="Click to move playhead"
                  style={{
                    height: TIMELINE_RULER_HEIGHT,
                    paddingLeft: KEYFRAME_SECTION_HORIZONTAL_PADDING,
                    paddingRight: KEYFRAME_SECTION_HORIZONTAL_PADDING,
                  }}
                >
                  <div className="relative h-full">
                    {Array.from(
                      {
                        length: Math.floor(timelineDuration / timelineLabelStep) + 1,
                      },
                      (_, index) => {
                        const time = Number((index * timelineLabelStep).toFixed(3));
                        const left = clamp((time / timelineDuration) * 100, 0, 100);
                        return (
                          <div
                            key={`timeline-label-${time}`}
                            className="pointer-events-none absolute inset-y-0 -translate-x-1/2"
                            style={{ left: `${left}%` }}
                          >
                            <div className="mx-auto mt-1.5 h-2 w-px bg-slate-500" />
                            <div className="pt-1 text-[10px] font-medium text-slate-400">
                              {formatTimelineLabel(time, timelineLabelStep)}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              {canvasItemIds.length === 0 ? (
                <div className="flex-1 px-3 py-4 text-sm text-slate-500">No items yet</div>
              ) : (
                <div className="relative flex-1">
                  {canvasItemIds.map((id) => (
                    <TimelineItemRow
                      key={id}
                      id={id}
                      onSeekFromPointer={seekFromPointer}
                      timelineDuration={timelineDuration}
                    />
                  ))}
                </div>
              )}

              {marqueeSelection ? (
                <div
                  className="pointer-events-none absolute z-40 rounded-sm border border-[var(--wise-accent)] bg-[var(--wise-accent)]/16"
                  style={{
                    left: marqueeSelection.left,
                    top: marqueeSelection.top,
                    width: marqueeSelection.width,
                    height: marqueeSelection.height,
                  }}
                />
              ) : null}
            </div>
          </div>
        </AppScrollArea>
      </Resizable>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Chooses a ruler label interval that becomes denser as users zoom in. */
function getTimelineLabelStep(zoom: number) {
  if (zoom >= 6) return 0.1;
  if (zoom >= 3) return 0.25;
  if (zoom >= 1.5) return 0.5;
  if (zoom >= 1.25) return 1;
  return TIMELINE_LABEL_STEP;
}

/** Formats ruler labels with sub-second precision only when the ruler is dense. */
function formatTimelineLabel(seconds: number, labelStep: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  if (labelStep < 1) {
    const fractionalSeconds = (seconds - minutes * 60).toFixed(2);
    return `${minutes}:${fractionalSeconds.padStart(5, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/** Creates a rectangle relative to the scrollable timeline content. */
function createMarqueeSelectionBox(
  content: HTMLDivElement,
  draft: MarqueeDraft,
): MarqueeSelectionBox {
  const bounds = content.getBoundingClientRect();
  const left = Math.min(draft.startClientX, draft.currentClientX) - bounds.left;
  const top = Math.min(draft.startClientY, draft.currentClientY) - bounds.top;
  const width = Math.abs(draft.currentClientX - draft.startClientX);
  const height = Math.abs(draft.currentClientY - draft.startClientY);

  return { left, top, width, height };
}

/** Collects all timeline keyframes that intersect the active marquee selection box. */
function collectSelectedTimelineKeyframes(
  content: HTMLDivElement | null,
  marqueeSelection: MarqueeSelectionBox | null,
) {
  if (!content || !marqueeSelection) return [];

  const contentBounds = content.getBoundingClientRect();
  const selectionBounds = {
    left: contentBounds.left + marqueeSelection.left,
    right: contentBounds.left + marqueeSelection.left + marqueeSelection.width,
    top: contentBounds.top + marqueeSelection.top,
    bottom: contentBounds.top + marqueeSelection.top + marqueeSelection.height,
  };

  return Array.from(content.querySelectorAll<HTMLElement>("[data-timeline-keyframe='true']"))
    .filter((node) => {
      const bounds = node.getBoundingClientRect();
      return !(
        bounds.right < selectionBounds.left ||
        bounds.left > selectionBounds.right ||
        bounds.bottom < selectionBounds.top ||
        bounds.top > selectionBounds.bottom
      );
    })
    .map((node) => {
      const itemId = node.dataset.keyframeItemId;
      const keyframeId = node.dataset.keyframeId;
      const property = node.dataset.keyframeProperty;
      const time = Number(node.dataset.keyframeTime);
      if (!itemId || !keyframeId || !property || !Number.isFinite(time)) return null;

      return {
        itemId,
        keyframeId,
        property,
        timestamp: time,
      } satisfies SelectedTimelineKeyframe;
    })
    .filter((keyframe): keyframe is SelectedTimelineKeyframe => keyframe !== null);
}
