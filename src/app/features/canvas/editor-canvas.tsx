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
        <div className="relative min-h-0 flex min-w-0 flex-1 items-stretch border border-[var(--wise-border)] xl:h-full">
          <div
            className="relative flex-1 min-w-0 overflow-hidden"
            style={{
              background:
                "repeating-linear-gradient(45deg, #262626, #262626 16px, #2c2c2c 16px, #2c2c2c 32px)",
            }}
          >
          <CanvasToolsFab />
            <canvas className="h-full w-full" ref={bindHost}></canvas>
            <VideoWorkAreaOverlay />
          </div>
          <div className="pointer-events-auto z-20 flex-shrink-0 border-l border-[var(--wise-border)] bg-[var(--wise-surface-raised)]/80">
            <CanvasSidePanel />
          </div>
          <CanvasZoomControl />
        </div>
      </div>

      <TimelinePanel />
      <SeekObjects />
    </section>
  );
}
