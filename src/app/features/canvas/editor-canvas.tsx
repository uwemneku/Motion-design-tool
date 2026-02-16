import CanvasHeader from "./canvas-header";
import TimelinePanel from "./timeline-panel";
import useFabricEditor from "./use-fabric-editor";

export default function EditorCanvas() {
  const { bindHost, fabricCanvas } = useFabricEditor();

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden  border border-slate-300 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08),0_8px_24px_rgba(15,23,42,0.06)]">
      <CanvasHeader fabricCanvas={fabricCanvas} />

      <div
        className=" flex-1 place-items-center p-5"
        style={{
          background:
            "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 16px, #e2e8f0 16px, #e2e8f0 32px)",
        }}
      >
        <div className="h-full w-full  overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
          <canvas ref={bindHost} className="w-full h-full" />
        </div>
      </div>

      <TimelinePanel />
    </section>
  );
}
