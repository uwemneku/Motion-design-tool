/** Editor Canvas.Tsx module implementation. */
import CanvasSidePanel from "./canvas-side-panel";
import CanvasToolsFab from "./canvas-tools-fab";
import CanvasZoomControl from "./canvas-zoom-control";
import CanvasItemsList from "./items-list/canvas-items-list";
import TimelinePanel from "./timeline/timeline-panel";
import VideoWorkAreaOverlay from "./video-work-area-overlay";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { SeekObjects } from "./hooks/use-seek-objects";

/** Main editor surface that composes the floating stage and timeline. */
export default function EditorCanvas() {
  const { bindHost } = useCanvasAppContext();

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div
        data-canvas_container
        className="flex min-h-0 flex-1 flex-col"
        style={{
          background:
            "radial-gradient(circle at top, rgba(124,149,185,0.14), transparent 30%), linear-gradient(180deg, rgba(9,12,18,0.96), rgba(4,6,10,0.98))",
        }}
      >
        <div className="relative min-h-0 flex min-w-0 flex-1 items-stretch overflow-hidden border-b border-[var(--wise-border)]/80 xl:h-full">
          <div
            className="relative min-w-0 flex-1 overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,10,16,0.55), rgba(3,5,9,0.78)), repeating-linear-gradient(45deg, rgba(255,255,255,0.016), rgba(255,255,255,0.016) 18px, rgba(255,255,255,0.03) 18px, rgba(255,255,255,0.03) 36px)",
            }}
          >
            <div data-testid="floating-layers-panel">
              <CanvasItemsList />
            </div>

            <div className="pointer-events-auto absolute bottom-0 right-0 top-0 z-20">
              <CanvasSidePanel floating />
            </div>

            <div className="relative h-full w-full overflow-hidden">
              <CanvasToolsFab />
              <canvas className="h-full w-full" ref={bindHost}></canvas>
              <VideoWorkAreaOverlay />
            </div>
            <CanvasZoomControl />
          </div>
        </div>
      </div>

      <TimelinePanel />
      <SeekObjects />
    </section>
  );
}
