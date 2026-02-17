import { useDispatch, useSelector } from "react-redux";
import type { MouseEvent } from "react";
import type { RootState } from "../../store";
import type { AppDispatch } from "../../store";
import { setSelectedId } from "../../store/editor-slice";

type TimelineItemRowProps = {
  id: string;
  onSeekFromPointer: (event: MouseEvent<HTMLDivElement>) => void;
  timelineDuration: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function TimelineItemRow({
  id,
  onSeekFromPointer,
  timelineDuration,
}: TimelineItemRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const name = useSelector((state: RootState) => state.editor.itemsRecord[id]?.name ?? id);
  const keyframes = useSelector((state: RootState) => state.editor.itemsRecord[id]?.keyframe ?? []);

  return (
    <div className="grid grid-cols-[180px_1fr] border-b border-slate-800 text-sm">
      <div
        className={`sticky left-0 z-10 border-r border-slate-700 px-3 py-2 text-slate-100 ${
          selectedId === id ? "bg-emerald-500/20 font-semibold" : "bg-slate-900"
        }`}
        onClick={() => {
          dispatch(setSelectedId(id));
        }}
      >
        <div className="w-full cursor-pointer text-left">{name}</div>
      </div>

      <div className="px-3 py-2">
        <div
          className={`relative h-6 rounded-md border ${
            selectedId === id
              ? "border-emerald-400 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]"
              : "border-slate-700"
          }`}
          onClick={onSeekFromPointer}
          title="Click to move playhead"
          style={{
            background:
              "repeating-linear-gradient(90deg, #0f172a, #0f172a 16px, #111827 16px, #111827 32px)",
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
  );
}
