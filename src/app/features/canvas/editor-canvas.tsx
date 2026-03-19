/** Editor Canvas.Tsx module implementation. */
import CanvasSidePanel from "./canvas-side-panel";
import CanvasToolsFab from "./canvas-tools-fab";
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
            "linear-gradient(180deg, rgba(25,25,28,0.98), rgba(14,14,16,0.98))",
        }}
      >
        <div className="relative min-h-0 flex min-w-0 flex-1 items-stretch overflow-hidden xl:h-full">
          <div
            className="relative min-w-0 flex-1 overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(24,24,26,0.92), rgba(18,18,20,0.96)), repeating-linear-gradient(45deg, rgba(255,255,255,0.012), rgba(255,255,255,0.012) 18px, rgba(255,255,255,0.022) 18px, rgba(255,255,255,0.022) 36px)",
            }}
          >
            <div className="relative z-20" data-testid="floating-layers-panel">
              <CanvasItemsList />
            </div>

            <div className="pointer-events-auto absolute bottom-0 right-0 top-0 z-20">
              <CanvasSidePanel floating />
            </div>

            <div className="relative z-0 h-full w-full overflow-hidden">
              <CanvasToolsFab />
              <canvas className="h-full w-full" ref={bindHost}></canvas>
              <VideoWorkAreaOverlay />
            </div>
          </div>
        </div>
      </div>

      <TimelinePanel />
      <SeekObjects />
    </section>
  );
}
