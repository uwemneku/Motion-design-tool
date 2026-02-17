import { useEffect, useMemo, useState } from "react";
import type { MutableRefObject } from "react";
import type { Canvas } from "fabric";
import { getVideoWorkAreaRect } from "../export/video-work-area";

type VideoWorkAreaOverlayProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
};

export default function VideoWorkAreaOverlay({
  fabricCanvas,
}: VideoWorkAreaOverlayProps) {
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const [viewportTransform, setViewportTransform] = useState(
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  const rect = useMemo(
    () => getVideoWorkAreaRect(hostSize.width, hostSize.height),
    [hostSize.height, hostSize.width],
  );

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const updateOverlayState = () => {
      const width = canvas.getWidth();
      const height = canvas.getHeight();
      setHostSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );

      const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
      const nextTransform = `matrix(${transform[0]}, ${transform[1]}, ${transform[2]}, ${transform[3]}, ${transform[4]}, ${transform[5]})`;
      setViewportTransform((prev) =>
        prev === nextTransform ? prev : nextTransform,
      );
    };

    updateOverlayState();
    canvas.on("after:render", updateOverlayState);

    return () => {
      canvas.off("after:render", updateOverlayState);
    };
  }, [fabricCanvas]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute rounded-sm border-2 border-sky-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.32)]"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          transform: viewportTransform,
          transformOrigin: "0 0",
        }}
      >
        <div className="absolute -top-6 left-0 rounded bg-sky-500/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Video Area
        </div>
      </div>
    </div>
  );
}
