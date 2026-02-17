import { useSelector } from "react-redux";
import type { RootState } from "../../store";

type TimelinePlayheadProps = {
  duration: number;
  keyframeSectionOffset: number;
  keyframeSectionRightOffset?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function TimelinePlayhead({
  duration,
  keyframeSectionOffset,
  keyframeSectionRightOffset = 0,
}: TimelinePlayheadProps) {
  const playheadTime = useSelector((state: RootState) => state.editor.playheadTime);
  const playheadPercent = clamp(playheadTime / duration, 0, 1) * 100;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-40"
      style={{ left: keyframeSectionOffset, right: keyframeSectionRightOffset }}
      aria-hidden
    >
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${playheadPercent}%` }} />
    </div>
  );
}
