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
    <div className="grid grid-cols-[180px_1fr] border-b border-slate-100 text-sm">
      <div
        className={`sticky left-0 z-10 border-r border-slate-200 px-3 py-2 text-slate-800 ${
          selectedId === id ? "bg-blue-50 font-semibold" : "bg-white"
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
              ? "border-blue-500 shadow-[inset_0_0_0_1px_#bfdbfe]"
              : "border-slate-200"
          }`}
          onClick={onSeekFromPointer}
          title="Click to move playhead"
          style={{
            background:
              "repeating-linear-gradient(90deg, #f8fafc, #f8fafc 16px, #f1f5f9 16px, #f1f5f9 32px)",
          }}
        >
          {keyframes.map((keyframe) => {
            const left = clamp((keyframe.timestamp / timelineDuration) * 100, 0, 100);
            return (
              <div
                key={keyframe.id}
                className="pointer-events-none absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-900 bg-amber-300"
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
