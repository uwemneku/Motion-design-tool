/** Timeline Item Row.Tsx timeline UI and behavior. */
import { ChevronRight } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { KEYFRAME_SECTION_HORIZONTAL_PADDING } from "../../../../const";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setPlayheadTime, setSelectedId, setSelectedKeyframe } from "../../../store/editor-slice";
import { TimelineItemPropertyRow } from "./timeline-item-property-row";
import type { AnimatableProperties } from "../../shapes/animatable-object/types";

type TimelineItemRowProps = {
  id: string;
  onSeekFromPointer: (event: MouseEvent<HTMLDivElement>) => void;
  timelineDuration: number;
};

type AnimationSpan = {
  start: number;
  end: number;
};

const DETAIL_ROW_DEFINITIONS: {
  label: string;
  property: keyof AnimatableProperties;
  valueType: "number" | "color";
}[] = [
  { label: "Position X", property: "left", valueType: "number" },
  { label: "Position Y", property: "top", valueType: "number" },
  { label: "Width", property: "width", valueType: "number" },
  { label: "Height", property: "height", valueType: "number" },
  { label: "Border Radius", property: "borderRadius", valueType: "number" },
  { label: "Opacity", property: "opacity", valueType: "number" },
  { label: "Rotation", property: "angle", valueType: "number" },
  { label: "Border Width", property: "strokeWidth", valueType: "number" },
  { label: "Fill", property: "fill", valueType: "color" },
  { label: "Stroke", property: "stroke", valueType: "color" },
] as const;

/** Timeline row for one canvas item, including property keyframe details. */
export default function TimelineItemRow({
  id,
  onSeekFromPointer,
  timelineDuration,
}: TimelineItemRowProps) {
  const dispatch = useAppDispatch();
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);
  const [isKeyframeExpanded, setIsKeyframeExpanded] = useState(false);

  const isSelected = useAppSelector((state) => state.editor.selectedId.includes(id));
  const name = useAppSelector((state) => state.editor.itemsRecord[id]?.name ?? id);
  const childIds = useAppSelector(
    (state) => state.editor.itemsRecord[id]?.childIds ?? [],
  );
  const itemKeyFrames = useAppSelector((state) => state.editor.itemsRecord[id]?.keyframe ?? null);
  // TODO: This should be derived from the item's keyframe data, not the markers.
  const animationSpan = getAnimationSpan(itemKeyFrames ?? []);
  const hasKeyframes = (itemKeyFrames?.length ?? 0) > 1;
  const isGroup = childIds.length > 0;

  /** Updates the editor playhead using normalized timeline precision. */
  const seekToTime = (time: number) => {
    dispatch(setPlayheadTime(Number(time.toFixed(3))));
  };

  return (
    <div className="border-b border-[var(--wise-border)] text-sm">
      <div className="grid grid-cols-[210px_1fr]">
        <div
          className={`sticky left-0 z-20 border-r border-[var(--wise-border)] px-3 py-2 text-[12px] text-slate-100 ${
            isSelected ? "bg-[var(--wise-accent)]/16 font-medium" : "bg-[var(--wise-surface)]"
          }`}
          onClick={() => {
            dispatch(setSelectedId([id]));
          }}
        >
          <div className="flex items-center gap-2">
            {isGroup ? (
              <button
                type="button"
                className="rounded p-0.5 text-slate-400 hover:bg-[var(--wise-surface-muted)] hover:text-slate-100"
                aria-label={isGroupExpanded ? "Collapse group rows" : "Expand group rows"}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsGroupExpanded((prev) => !prev);
                }}
              >
                <ChevronRight
                  className={`size-3 transition-transform ${isGroupExpanded ? "rotate-90" : "rotate-0"}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            ) : (
              <span className="block size-4 shrink-0" aria-hidden />
            )}
            {hasKeyframes ? (
              <button
                type="button"
                className="rounded p-0.5 text-slate-400 hover:bg-[var(--wise-surface-muted)] hover:text-slate-100"
                aria-label={
                  isKeyframeExpanded ? "Collapse keyframe details" : "Expand keyframe details"
                }
                onClick={(event) => {
                  event.stopPropagation();
                  setIsKeyframeExpanded((prev) => !prev);
                }}
              >
                <ChevronRight
                  className={`size-3 transition-transform ${isKeyframeExpanded ? "rotate-90" : "rotate-0"}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            ) : null}
            <div className="min-w-0 flex-1 cursor-pointer truncate text-left">{name}</div>
          </div>
        </div>

        <div
          className="py-2"
          style={{
            paddingLeft: KEYFRAME_SECTION_HORIZONTAL_PADDING,
            paddingRight: KEYFRAME_SECTION_HORIZONTAL_PADDING,
          }}
        >
          <div
            className={`relative h-6 rounded-sm border ${
              isSelected
                ? "border-[var(--wise-accent)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]"
                : "border-[var(--wise-border)]"
            }`}
            onClick={onSeekFromPointer}
            title="Click to move playhead"
            style={{
              background:
                "repeating-linear-gradient(45deg, #2c2c2c, #2c2c2c 16px, #1f1f1f 16px, #1f1f1f 32px)",
            }}
          >
            {animationSpan ? (
              <button
                type="button"
                className="absolute top-1/2 z-30 h-full -translate-y-1/2 rounded-sm bg-[var(--wise-accent)]/70 shadow-[0_0_0_1px_rgba(229,231,235,0.24)]"
                style={getAnimationSpanStyle(animationSpan, timelineDuration)}
                title={`${name} animation ${animationSpan.start.toFixed(2)}s - ${animationSpan.end.toFixed(2)}s`}
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch(setSelectedId([id]));
                  dispatch(setSelectedKeyframe(null));
                  seekToTime(animationSpan.start);
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {isKeyframeExpanded ? (
        <div className="border-t border-[var(--wise-border)] bg-[var(--wise-surface)]/60">
          {DETAIL_ROW_DEFINITIONS.map((row) => (
            <TimelineItemPropertyRow
              key={row.property}
              itemId={id}
              label={row.label}
              property={row.property}
              valueType={row.valueType}
              timelineDuration={timelineDuration}
            />
          ))}
        </div>
      ) : null}

      {isGroupExpanded ? (
        <div className="border-t border-[var(--wise-border)] bg-[var(--wise-surface)]/50">
          {childIds.map((childId) => (
            <div key={childId} className="ml-5 border-l border-[var(--wise-border)]/70">
              <TimelineItemRow
                id={childId}
                onSeekFromPointer={onSeekFromPointer}
                timelineDuration={timelineDuration}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Clamps timeline percentages and pointer positions into the valid range. */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Derives the visible animation range from the item's timeline markers. */
function getAnimationSpan(
  markers: Array<{
    id: string;
    timestamp: number;
  }>,
): AnimationSpan | null {
  if (markers.length === 0) return null;

  const sortedMarkers = [...markers].sort((left, right) => left.timestamp - right.timestamp);
  return {
    start: sortedMarkers[0].timestamp,
    end: sortedMarkers[sortedMarkers.length - 1].timestamp,
  };
}

/** Computes the top-row animation bar position from the marker span. */
function getAnimationSpanStyle(span: AnimationSpan, timelineDuration: number) {
  const start = clamp((span.start / timelineDuration) * 100, 0, 100);
  const end = clamp((span.end / timelineDuration) * 100, 0, 100);
  const width = Math.max(end - start, 0);

  return {
    left: `${start}%`,
    width: `${width}%`,
  };
}
