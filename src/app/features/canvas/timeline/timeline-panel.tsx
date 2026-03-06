/** Timeline Panel.Tsx timeline UI and behavior. */
import { type MouseEvent, useCallback, useState } from "react";
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
import TimelineItemRow from "./timeline-item-row";
import TimelinePlayhead from "./timeline-playhead";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setPlayheadTime } from "../../../store/editor-slice";
import TimeStampControl from "./timestamp-control";

const TIMELINE_ZOOM_MIN = 1;
const TIMELINE_ZOOM_MAX = 4;
const TIMELINE_ZOOM_STEP = 0.25;
const TIMELINE_TOOLBAR_HEIGHT = 48;
const TIMELINE_RULER_HEIGHT = 36;

/** Timeline container with playback loop, labels, and item rows. */
export default function TimelinePanel() {
  const dispatch = useAppDispatch();
  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);

  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_DEFAULT_HEIGHT);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const timelineContentWidth = `calc(${LABEL_COLUMN_WIDTH}px + (100% - ${LABEL_COLUMN_WIDTH}px) * ${timelineZoom})`;

  const seekFromPointer = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const styles = window.getComputedStyle(event.currentTarget);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const trackWidth = Math.max(0, bounds.width - paddingLeft - paddingRight);
      if (trackWidth <= 0) return;

      const x = clamp(event.clientX - bounds.left - paddingLeft, 0, trackWidth);
      const nextTime = (x / trackWidth) * TIMELINE_DURATION;
      dispatch(setPlayheadTime(Number(nextTime.toFixed(3))));
    },
    [dispatch],
  );

  return (
    <section
      className="shrink-0 border-t border-(--wise-border) bg-(--wise-surface) focus-visible:outline-none z-30"
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
            clamp(
              prev + delta.height,
              TIMELINE_MIN_HEIGHT,
              TIMELINE_MAX_HEIGHT,
            ),
          );
        }}
      >
        <div
          className="border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)]"
          data-testid="timeline-toolbar"
          style={{ height: TIMELINE_TOOLBAR_HEIGHT }}
        >
          <div className="grid h-full grid-cols-[210px_1fr_210px] items-center px-3 py-2">
            <div />
            <div className="flex items-center justify-center">
              <TimeStampControl />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-300 transition hover:bg-[var(--wise-surface-muted)]"
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
              <span className="min-w-[3.5rem] text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {Math.round(timelineZoom * 100)}%
              </span>
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-300 transition hover:bg-[var(--wise-surface-muted)]"
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
          <div className="h-full w-full">
            <div
              className="relative h-full"
              style={{
                minWidth: "100%",
                width: timelineContentWidth,
              }}
            >
              <TimelinePlayhead
                duration={TIMELINE_DURATION}
                keyframeSectionOffset={
                  LABEL_COLUMN_WIDTH + KEYFRAME_SECTION_HORIZONTAL_PADDING
                }
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
                        length:
                          Math.floor(TIMELINE_DURATION / TIMELINE_LABEL_STEP) +
                          1,
                      },
                      (_, index) => {
                        const time = index * TIMELINE_LABEL_STEP;
                        const left = clamp(
                          (time / TIMELINE_DURATION) * 100,
                          0,
                          100,
                        );
                        return (
                          <div
                            key={`timeline-label-${time}`}
                            className="pointer-events-none absolute inset-y-0 -translate-x-1/2"
                            style={{ left: `${left}%` }}
                          >
                            <div className="mx-auto mt-1.5 h-2 w-px bg-slate-500" />
                            <div className="pt-1 text-[10px] font-medium text-slate-400">
                              {formatTimelineLabel(time)}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              {canvasItemIds.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  No items yet
                </div>
              ) : (
                <div className="z-10 relative">
                  {canvasItemIds.map((id) => (
                    <TimelineItemRow
                      key={id}
                      id={id}
                      onSeekFromPointer={seekFromPointer}
                      timelineDuration={TIMELINE_DURATION}
                    />
                  ))}
                </div>
              )}
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

function formatTimelineLabel(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
