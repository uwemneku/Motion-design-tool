/** Editor Canvas.Tsx module implementation. */
import CanvasHeader from "./canvas-header/canvas-header";
import CanvasSidePanel from "./canvas-side-panel";
import CanvasToolsFab from "./canvas-tools-fab";
import CanvasZoomControl from "./canvas-zoom-control";
import TimelinePanel from "./timeline/timeline-panel";
import VideoWorkAreaOverlay from "./video-work-area-overlay";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { SeekObjects } from "./hooks/use-seek-objects";

/** Main editor surface that composes canvas, side panel, and timeline. */
export default function EditorCanvas() {
  const { bindHost } = useCanvasAppContext();

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] ">
      <CanvasHeader />

      <div
        data-canvas_container
        className="flex min-h-0 flex-1 flex-col"
        style={{
          background:
            "repeating-linear-gradient(45deg, #262626, #262626 16px, #2c2c2c 16px, #2c2c2c 32px)",
        }}
      >
        <div className="relative   min-w-0 flex-1 overflow-hidden border border-[var(--wise-border)]  xl:h-full">
          <CanvasToolsFab />
          <div className="h-full w-full">
            <canvas className="h-full w-full" ref={bindHost}></canvas>
          </div>
          <CanvasZoomControl />
          <div className="pointer-events-none absolute h-full right-3 top-3 z-30  max-h-[calc(100%-24px)] overflow-hidden">
            <CanvasSidePanel />
          </div>
          <VideoWorkAreaOverlay />
        </div>
      </div>

      <TimelinePanel />
      <SeekObjects />
    </section>
  );
}
