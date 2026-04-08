/** Editor Canvas.Tsx module implementation. */
import CanvasSidePanel from "./canvas-side-panel";
import CanvasToolsFab from "./canvas-tools-fab";
import DomTransformHandles from "./dom-transform-handles";
import { PathDrawingTool } from "./hooks/use-path-drawing-tool";
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
          background: "linear-gradient(180deg, rgba(25,25,28,0.98), rgba(14,14,16,0.98))",
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
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute inset-x-[8%] inset-y-[5%] rounded-[28px] border border-white/4 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),rgba(255,255,255,0)_68%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />
              <div className="absolute inset-x-[14%] inset-y-[10%] rounded-[32px] border border-[rgba(141,171,255,0.08)] bg-[radial-gradient(circle_at_center,rgba(141,171,255,0.05),rgba(20,20,24,0)_72%)] shadow-[0_32px_90px_rgba(0,0,0,0.24)]" />
            </div>

            <div className="relative z-20" data-testid="floating-layers-panel">
              <CanvasItemsList />
            </div>

            <div className="pointer-events-auto absolute bottom-3 right-3 top-3 z-20">
              <CanvasSidePanel floating />
            </div>

            <div className="relative z-0 h-full w-full overflow-hidden">
              <CanvasToolsFab />
              <canvas className="h-full w-full" ref={bindHost}></canvas>
              <DomTransformHandles />
              <VideoWorkAreaOverlay />
            </div>
          </div>
        </div>
      </div>

      <TimelinePanel />
      <PathDrawingTool />
      <SeekObjects />
    </section>
  );
}
