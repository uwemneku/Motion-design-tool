/** Timeline Playhead.Tsx timeline UI and behavior. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setPlayheadTime } from "../../../store/editor-slice";

type TimelinePlayheadProps = {
  duration: number;
  keyframeSectionOffset: number;
  keyframeSectionRightOffset?: number;
  topOffset?: number;
  rulerHeight?: number;
};

/** Draggable timeline playhead constrained to the keyframe section. */
export default function TimelinePlayhead({
  duration,
  keyframeSectionOffset,
  keyframeSectionRightOffset = 0,
  topOffset = 0,
  rulerHeight = 36,
}: TimelinePlayheadProps) {
  const dispatch = useAppDispatch();
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);
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

  const handleHeight = Math.min(18, Math.max(14, rulerHeight - 12));
  const handleTop = Math.max(3, Math.floor((rulerHeight - handleHeight) / 2) - 6);
  const lineTop = handleTop + handleHeight - 2;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute top-0 bottom-0 h-full min-h-[160px] z-40"
      style={{
        top: topOffset,
        left: keyframeSectionOffset,
        right: keyframeSectionRightOffset,
      }}
      aria-hidden
    >
      <div
        className="pointer-events-auto absolute top-0 bottom-0 z-40 w-4 -translate-x-1/2 cursor-ew-resize"
        style={{ left: `${playheadPercent}%` }}
        onMouseDown={startDragging}
      >
        <div
          className="absolute left-1/2 z-40 w-3 -translate-x-1/2 rounded-full border border-[#e5e7eb] bg-[var(--wise-accent)] shadow"
          style={{
            top: handleTop,
            height: handleHeight,
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 z-40 w-0.5 -translate-x-1/2 bg-[var(--wise-accent)]"
          style={{ top: lineTop }}
        />
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
