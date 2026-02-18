/** Timeline Playhead.Tsx timeline UI and behavior. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store";
import { setPlayheadTime } from "../../../store/editor-slice";

type TimelinePlayheadProps = {
  duration: number;
  keyframeSectionOffset: number;
  keyframeSectionRightOffset?: number;
};

/** Draggable timeline playhead constrained to the keyframe section. */
export default function TimelinePlayhead({
  duration,
  keyframeSectionOffset,
  keyframeSectionRightOffset = 0,
}: TimelinePlayheadProps) {
  const dispatch = useDispatch<AppDispatch>();
  const playheadTime = useSelector(
    (state: RootState) => state.editor.playheadTime,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const playheadPercent = clamp(playheadTime / duration, 0, 1) * 100;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width <= 0) return;

      const x = clamp(clientX - bounds.left, 0, bounds.width);
      const nextTime = (x / bounds.width) * duration;
      dispatch(setPlayheadTime(Number(nextTime.toFixed(3))));
    },
    [dispatch, duration],
  );

  const startDragging = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    seekFromClientX(event.clientX);
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      seekFromClientX(event.clientX);
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, seekFromClientX]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute top-0 bottom-0 h-full min-h-[160px] z-40"
      style={{ left: keyframeSectionOffset, right: keyframeSectionRightOffset }}
      aria-hidden
    >
      <div
        className="pointer-events-auto absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-ew-resize"
        style={{ left: `${playheadPercent}%` }}
        onMouseDown={startDragging}
      >
        <div className="absolute z-20 left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full border border-[#e8eeff] bg-[var(--wise-accent)] shadow" />
        <div className="absolute bottom-0 left-1/2 top-0 w-0.5 -translate-x-1/2 bg-[var(--wise-accent)]" />
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
