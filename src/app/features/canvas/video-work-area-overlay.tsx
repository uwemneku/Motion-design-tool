/** Video Work Area Overlay.Tsx module implementation. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Canvas } from "fabric";
import { getVideoWorkAreaRect } from "../export/video-work-area";

type AspectOption = {
  label: string;
  ratio: number;
};

type VideoWorkAreaOverlayProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  aspectRatio: number;
  aspectLabel: string;
  aspectOptions: AspectOption[];
  onSelectAspectRatio: (nextRatio: number) => void;
};

/** Overlay that marks the export-visible video area and aspect selector. */
export default function VideoWorkAreaOverlay({
  fabricCanvas,
  aspectRatio,
  aspectLabel,
  aspectOptions,
  onSelectAspectRatio,
}: VideoWorkAreaOverlayProps) {
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rect = useMemo(
    () => getVideoWorkAreaRect(hostSize.width, hostSize.height, aspectRatio),
    [aspectRatio, hostSize.height, hostSize.width],
  );

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const updateOverlayState = () => {
      const width = canvas.getWidth();
      const height = canvas.getHeight();
      setHostSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );

      const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
      const nextTransform = `matrix(${transform[0]}, ${transform[1]}, ${transform[2]}, ${transform[3]}, ${transform[4]}, ${transform[5]})`;
      containerRef.current?.style.setProperty(
        "--videoArea-transform",
        nextTransform,
      );
    };

    updateOverlayState();
    canvas.on("after:render", updateOverlayState);

    return () => {
      canvas.off("after:render", updateOverlayState);
    };
  }, [fabricCanvas]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      ref={containerRef}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: "var(--videoArea-transform, matrix(1, 0, 0, 1, 0, 0))",
          transformOrigin: "0 0",
        }}
      >
        <div
          className="absolute rounded-sm border-2 border-[var(--wise-accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          <div className="pointer-events-auto absolute -top-6 left-0 flex items-center gap-1 opacity-45 transition-opacity hover:opacity-100">
            <div className="rounded bg-[var(--wise-accent)]/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Video Area
            </div>
            <select
              value={aspectLabel}
              onChange={(event) => {
                const selected = aspectOptions.find(
                  (option) => option.label === event.target.value,
                );
                if (selected) {
                  onSelectAspectRatio(selected.ratio);
                }
              }}
              className="appearance-none rounded border border-[var(--wise-border)] bg-[var(--wise-surface-raised)]/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d4d4d4] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 hover:bg-[var(--wise-surface-muted)]"
              style={{
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
              aria-label="Change video aspect ratio"
            >
              {aspectOptions.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
