import EditorCanvas from "../features/canvas/editor-canvas";
import CanvasItemsList from "../features/canvas/canvas-items-list";

export default function AppLayout() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside
        data-objects
        className="border-b border-slate-300 bg-gradient-to-b from-white to-slate-50 p-6 md:border-r md:border-b-0"
      >
        <CanvasItemsList />
      </aside>
      <main className="flex min-h-0 flex-col  max-h-screen">
        <EditorCanvas />
      </main>
    </div>
  );
}
