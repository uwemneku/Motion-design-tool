import { useMemo, useState, type MouseEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store";
import type { AppDispatch } from "../../store";
import { setSelectedId } from "../../store/editor-slice";
import { useCanvasAppContext } from "./use-canvas-app-context";
import type { Keyframe } from "../shapes/animatable-object/types";

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

const TIME_EPSILON = 0.0001;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatValue(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

function getValueAtTime(frames: Keyframe[], time: number) {
  const frame = frames.find((item) => Math.abs(item.time - time) <= TIME_EPSILON);
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
    new Set([...firstFrames.map((item) => item.time), ...secondFrames.map((item) => item.time)]),
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

export default function TimelineItemRow({
  id,
  onSeekFromPointer,
  timelineDuration,
}: TimelineItemRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById } = useCanvasAppContext();
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const name = useSelector((state: RootState) => state.editor.itemsRecord[id]?.name ?? id);
  const keyframes = useSelector((state: RootState) => state.editor.itemsRecord[id]?.keyframe ?? []);

  const detailRows = useMemo(() => {
    const instance = getInstanceById(id);
    if (!instance) return [];

    const leftFrames = (instance.keyframes.left ?? []) as Keyframe[];
    const topFrames = (instance.keyframes.top ?? []) as Keyframe[];
    const scaleXFrames = (instance.keyframes.scaleX ?? []) as Keyframe[];
    const scaleYFrames = (instance.keyframes.scaleY ?? []) as Keyframe[];
    const opacityFrames = (instance.keyframes.opacity ?? []) as Keyframe[];
    const angleFrames = (instance.keyframes.angle ?? []) as Keyframe[];

    return [
      buildPairedDetailRow("Position", "x", leftFrames, "y", topFrames),
      buildPairedDetailRow("Scale", "x", scaleXFrames, "y", scaleYFrames),
      buildSingleDetailRow("Opacity", opacityFrames),
      buildSingleDetailRow("Rotation", angleFrames),
    ].filter((row) => row.entries.length > 0);
  }, [getInstanceById, id, keyframes]);

  return (
    <div className="border-b border-slate-800 text-sm">
      <div className="grid grid-cols-[180px_1fr]">
        <div
          className={`sticky left-0 z-10 border-r border-slate-700 px-3 py-2 text-slate-100 ${
            selectedId === id ? "bg-sky-500/20 font-semibold" : "bg-slate-900"
          }`}
          onClick={() => {
            dispatch(setSelectedId(id));
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label={isExpanded ? "Collapse keyframe details" : "Expand keyframe details"}
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
                ? "border-sky-400 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.45)]"
                : "border-slate-700"
            }`}
            onClick={onSeekFromPointer}
            title="Click to move playhead"
            style={{
              background:
                "repeating-linear-gradient(45deg, #0f172a, #0f172a 16px, #111827 16px, #111827 32px)",
            }}
          >
            {keyframes.map((keyframe) => {
              const left = clamp((keyframe.timestamp / timelineDuration) * 100, 0, 100);
              return (
                <div
                  key={keyframe.id}
                  className="pointer-events-none absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200 bg-amber-400"
                  style={{ left: `${left}%` }}
                  title={`${name} @ ${keyframe.timestamp.toFixed(2)}s`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-slate-800 bg-slate-950/60">
          {detailRows.length === 0 ? (
            <div className="grid grid-cols-[180px_1fr]">
              <div className="sticky left-0 z-10 border-r border-slate-700 bg-slate-900 px-3 py-2 pl-8 text-xs text-slate-500">
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
                className="grid grid-cols-[180px_1fr] border-b border-slate-800 last:border-b-0"
              >
                <div className="sticky left-0 z-10 border-r border-slate-700 bg-slate-900 px-3 py-2 pl-8 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {row.label}
                </div>
                <div className="px-3 py-2">
                  <div
                    className="relative h-6 rounded border border-slate-700"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, #0f172a, #0f172a 16px, #111827 16px, #111827 32px)",
                    }}
                  >
                    {row.entries.map((entry, index) => {
                      const left = clamp((entry.time / timelineDuration) * 100, 0, 100);
                      return (
                        <div
                          key={`${row.label}-${entry.time}-${index}`}
                          className="absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-sky-400"
                          style={{ left: `${left}%` }}
                          title={`${row.label} @ ${entry.time.toFixed(2)}s • ${entry.text}`}
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
