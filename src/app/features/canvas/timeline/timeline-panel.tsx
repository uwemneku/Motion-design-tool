/** Timeline Panel.Tsx timeline UI and behavior. */
import { type MouseEvent, useCallback, useState } from "react";
import { Resizable } from "re-resizable";
import { useDispatch } from "react-redux";
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
import { useAppSelector, type AppDispatch } from "../../../store";
import { setPlayheadTime } from "../../../store/editor-slice";
import TimeStampControl from "./timestamp-control";

/** Timeline container with playback loop, labels, and item rows. */
export default function TimelinePanel() {
  const dispatch = useDispatch<AppDispatch>();
  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);

  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_DEFAULT_HEIGHT);

  const seekFromPointer = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = clamp(event.clientX - bounds.left, 0, bounds.width);
      const nextTime = (x / bounds.width) * TIMELINE_DURATION;
      dispatch(setPlayheadTime(Number(nextTime.toFixed(3))));
    },
    [dispatch],
  );

  return (
    <section
      className="shrink-0 border-t border-(--wise-border) bg-(--wise-surface) focus-visible:outline-none"
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
        <AppScrollArea
          rootClassName="h-full overflow-hidden"
          viewportClassName="h-full w-full"
          showHorizontalScrollbar
          showCorner
          horizontalScrollbarClassName="flex h-2.5 touch-none select-none border-t border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-0.5"
          verticalScrollbarClassName="flex w-2.5 touch-none select-none border-l border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-0.5"
          cornerClassName="bg-[var(--wise-surface-raised)]"
        >
          <div className="h-full w-full">
            <div className="relative h-full ">
              <TimelinePlayhead
                duration={TIMELINE_DURATION}
                keyframeSectionOffset={
                  LABEL_COLUMN_WIDTH + KEYFRAME_SECTION_HORIZONTAL_PADDING
                }
                keyframeSectionRightOffset={KEYFRAME_SECTION_HORIZONTAL_PADDING}
              />

              <div className="sticky top-0 z-20 grid grid-cols-[210px_1fr] border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] text-xs font-medium text-slate-200">
                <div
                  data-item
                  className="sticky left-0 z-30 border-r border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-3 py-2"
                >
                  <TimeStampControl />
                </div>
                <div
                  className="relative cursor-pointer px-[20px] py-2"
                  onClick={seekFromPointer}
                  title="Click to move playhead"
                  style={{
                    paddingLeft: KEYFRAME_SECTION_HORIZONTAL_PADDING,
                    paddingRight: KEYFRAME_SECTION_HORIZONTAL_PADDING,
                  }}
                >
                  <div className="relative h-4">
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
                            className="pointer-events-none absolute top-0 -translate-x-1/2"
                            style={{ left: `${left}%` }}
                          >
                            <div className="mx-auto h-1.5 w-px bg-slate-500" />
                            <div className="pt-0.5 text-[10px] font-medium text-slate-400">
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
                canvasItemIds.map((id) => (
                  <TimelineItemRow
                    key={id}
                    id={id}
                    onSeekFromPointer={seekFromPointer}
                    timelineDuration={TIMELINE_DURATION}
                  />
                ))
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
