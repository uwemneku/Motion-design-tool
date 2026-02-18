import { useMemo, useState, type MouseEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store";
import type { AppDispatch } from "../../../store";
import { setPlayheadTime, setSelectedId } from "../../../store/editor-slice";
import type {
  ColorKeyframe,
  KeyframeEasing,
  Keyframe,
} from "../../shapes/animatable-object/types";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { EASING_OPTIONS, TIME_EPSILON } from "../../../../const";

type TimelineItemRowProps = {
  id: string;
  onSeekFromPointer: (event: MouseEvent<HTMLDivElement>) => void;
  timelineDuration: number;
};

type DetailEntry = {
  time: number;
  text: string;
};

type DetailRow = {
  label: string;
  entries: DetailEntry[];
};

export default function TimelineItemRow({
  id,
  onSeekFromPointer,
  timelineDuration,
}: TimelineItemRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById } = useCanvasAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedKeyframeTime, setSelectedKeyframeTime] = useState<
    number | null
  >(null);
  const [easingRevision, setEasingRevision] = useState(0);

  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const name = useSelector(
    (state: RootState) => state.editor.itemsRecord[id]?.name ?? id,
  );
  const keyframes = useSelector(
    (state: RootState) => state.editor.itemsRecord[id]?.keyframe ?? [],
  );

  const detailRows = useMemo(() => {
    const instance = getInstanceById(id);
    if (!instance) return [];

    const leftFrames = (instance.keyframes.left ?? []) as Keyframe[];
    const topFrames = (instance.keyframes.top ?? []) as Keyframe[];
    const scaleXFrames = (instance.keyframes.scaleX ?? []) as Keyframe[];
    const scaleYFrames = (instance.keyframes.scaleY ?? []) as Keyframe[];
    const opacityFrames = (instance.keyframes.opacity ?? []) as Keyframe[];
    const angleFrames = (instance.keyframes.angle ?? []) as Keyframe[];
    const fillFrames = (instance.colorKeyframes.fill ?? []) as ColorKeyframe[];
    const strokeFrames = (instance.colorKeyframes.stroke ??
      []) as ColorKeyframe[];

    return [
      buildPairedDetailRow("Position", "x", leftFrames, "y", topFrames),
      buildPairedDetailRow("Scale", "x", scaleXFrames, "y", scaleYFrames),
      buildSingleDetailRow("Opacity", opacityFrames),
      buildSingleDetailRow("Rotation", angleFrames),
      buildColorDetailRow("Fill", fillFrames),
      buildColorDetailRow("Stroke", strokeFrames),
    ].filter((row) => row.entries.length > 0);
  }, [getInstanceById, id, keyframes]);

  const seekToTime = (time: number) => {
    dispatch(setPlayheadTime(Number(time.toFixed(3))));
  };
  const selectedEasing = useMemo(() => {
    if (selectedKeyframeTime === null) return null;
    const instance = getInstanceById(id);
    if (!instance) return null;
    return getEasingAtTime(instance, selectedKeyframeTime);
  }, [easingRevision, getInstanceById, id, selectedKeyframeTime]);

  return (
    <div className="border-b border-[var(--wise-border)] text-sm">
      <div className="grid grid-cols-[180px_1fr]">
        <div
          className={`sticky left-0 z-10 border-r border-[var(--wise-border)] px-3 py-2 text-slate-100 ${
            selectedId === id
              ? "bg-[var(--wise-accent)]/16 font-semibold"
              : "bg-[var(--wise-surface)]"
          }`}
          onClick={() => {
            dispatch(setSelectedId(id));
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded p-0.5 text-slate-400 hover:bg-[var(--wise-surface-muted)] hover:text-slate-100"
              aria-label={
                isExpanded
                  ? "Collapse keyframe details"
                  : "Expand keyframe details"
              }
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className={`size-3 transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <div className="w-full cursor-pointer text-left">{name}</div>
          </div>
        </div>

        <div className="px-3 py-2">
          <div
            className={`relative h-6 rounded-md border ${
              selectedId === id
                ? "border-[var(--wise-accent)] shadow-[inset_0_0_0_1px_rgba(91,140,255,0.42)]"
                : "border-[var(--wise-border)]"
            }`}
            onClick={onSeekFromPointer}
            title="Click to move playhead"
            style={{
              background:
                "repeating-linear-gradient(45deg, #0f172a, #0f172a 16px, #111827 16px, #111827 32px)",
            }}
          >
            {keyframes.map((keyframe) => {
              const left = clamp(
                (keyframe.timestamp / timelineDuration) * 100,
                0,
                100,
              );
              return (
                <button
                  type="button"
                  key={keyframe.id}
                  className="absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e8eeff] bg-[var(--wise-accent)]"
                  style={{ left: `${left}%` }}
                  title={`${name} @ ${keyframe.timestamp.toFixed(2)}s`}
                  onClick={(event) => {
                    event.stopPropagation();
                    seekToTime(keyframe.timestamp);
                    setSelectedKeyframeTime(keyframe.timestamp);
                  }}
                />
              );
            })}
          </div>
          {selectedKeyframeTime !== null ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
              <span>{`Keyframe ${selectedKeyframeTime.toFixed(2)}s`}</span>
              <select
                className="rounded border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1 text-xs text-slate-100 outline-none"
                value={selectedEasing ?? "linear"}
                onChange={(event) => {
                  const instance = getInstanceById(id);
                  if (!instance) return;
                  applyEasingAtTime(
                    instance,
                    selectedKeyframeTime,
                    event.target.value as KeyframeEasing,
                  );
                  instance.fabricObject.canvas?.requestRenderAll();
                  setEasingRevision((prev) => prev + 1);
                }}
              >
                {selectedEasing === "mixed" ? (
                  <option value="linear" disabled>
                    mixed
                  </option>
                ) : null}
                {EASING_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-[var(--wise-border)] bg-[var(--wise-surface)]/60">
          {detailRows.length === 0 ? (
            <div className="grid grid-cols-[180px_1fr]">
              <div className="sticky left-0 z-10 border-r border-[var(--wise-border)] bg-[var(--wise-surface)] px-3 py-2 pl-8 text-xs text-slate-500">
                Details
              </div>
              <div className="px-3 py-2 text-xs text-slate-500">
                No keyframe details available.
              </div>
            </div>
          ) : (
            detailRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[180px_1fr] border-b border-[var(--wise-border)] last:border-b-0"
              >
                <div className="sticky left-0 z-10 border-r border-[var(--wise-border)] bg-[var(--wise-surface)] px-3 py-2 pl-8 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {row.label}
                </div>
                <div className="px-3 py-2">
                  <div
                    className="relative h-6 rounded border border-[var(--wise-border)]"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, #0f172a, #0f172a 16px, #111827 16px, #111827 32px)",
                    }}
                  >
                    {row.entries.map((entry, index) => {
                      const left = clamp(
                        (entry.time / timelineDuration) * 100,
                        0,
                        100,
                      );
                      return (
                        <button
                          type="button"
                          key={`${row.label}-${entry.time}-${index}`}
                          className="absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e8eeff] bg-[var(--wise-accent)]"
                          style={{ left: `${left}%` }}
                          title={`${row.label} @ ${entry.time.toFixed(2)}s • ${entry.text}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            seekToTime(entry.time);
                            setSelectedKeyframeTime(entry.time);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
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

function getValueAtTime(frames: Keyframe[], time: number) {
  const frame = frames.find(
    (item) => Math.abs(item.time - time) <= TIME_EPSILON,
  );
  return frame?.value;
}

function buildPairedDetailRow(
  label: string,
  firstLabel: string,
  firstFrames: Keyframe[],
  secondLabel: string,
  secondFrames: Keyframe[],
): DetailRow {
  const times = Array.from(
    new Set([
      ...firstFrames.map((item) => item.time),
      ...secondFrames.map((item) => item.time),
    ]),
  ).sort((a, b) => a - b);

  const entries = times.map((time) => {
    const firstValue = getValueAtTime(firstFrames, time);
    const secondValue = getValueAtTime(secondFrames, time);
    return {
      time,
      text: `${firstLabel}:${firstValue === undefined ? "-" : formatValue(firstValue)} ${secondLabel}:${secondValue === undefined ? "-" : formatValue(secondValue)}`,
    };
  });

  return { label, entries };
}

function buildSingleDetailRow(label: string, frames: Keyframe[]): DetailRow {
  return {
    label,
    entries: frames
      .map((frame) => ({
        time: frame.time,
        text: formatValue(frame.value),
      }))
      .sort((a, b) => a.time - b.time),
  };
}

function buildColorDetailRow(
  label: string,
  frames: ColorKeyframe[],
): DetailRow {
  return {
    label,
    entries: frames
      .map((frame) => ({
        time: frame.time,
        text: frame.value,
      }))
      .sort((a, b) => a.time - b.time),
  };
}

function applyEasingAtTime(
  instance: {
    keyframes: Partial<
      Record<string, Array<{ time: number; easing: KeyframeEasing }>>
    >;
    colorKeyframes: Partial<
      Record<string, Array<{ time: number; easing: KeyframeEasing }>>
    >;
  },
  time: number,
  easing: KeyframeEasing,
) {
  Object.values(instance.keyframes).forEach((frames) => {
    if (!frames) return;
    frames.forEach((frame) => {
      if (Math.abs(frame.time - time) <= TIME_EPSILON) {
        frame.easing = easing;
      }
    });
  });

  Object.values(instance.colorKeyframes).forEach((frames) => {
    if (!frames) return;
    frames.forEach((frame) => {
      if (Math.abs(frame.time - time) <= TIME_EPSILON) {
        frame.easing = easing;
      }
    });
  });
}

function getEasingAtTime(
  instance: {
    keyframes: Partial<
      Record<string, Array<{ time: number; easing: KeyframeEasing }>>
    >;
    colorKeyframes: Partial<
      Record<string, Array<{ time: number; easing: KeyframeEasing }>>
    >;
  },
  time: number,
) {
  const easings = new Set<KeyframeEasing>();

  Object.values(instance.keyframes).forEach((frames) => {
    if (!frames) return;
    frames.forEach((frame) => {
      if (Math.abs(frame.time - time) <= TIME_EPSILON) {
        easings.add(frame.easing);
      }
    });
  });

  Object.values(instance.colorKeyframes).forEach((frames) => {
    if (!frames) return;
    frames.forEach((frame) => {
      if (Math.abs(frame.time - time) <= TIME_EPSILON) {
        easings.add(frame.easing);
      }
    });
  });

  if (easings.size === 0) return null;
  if (easings.size === 1) return Array.from(easings)[0];
  return "mixed";
}
