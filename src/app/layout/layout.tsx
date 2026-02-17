import * as ScrollArea from "@radix-ui/react-scroll-area";
import EditorCanvas from "../features/canvas/editor-canvas";
import CanvasItemsList from "../features/canvas/canvas-items-list";
import AIChatPanel from "../features/ai/ai-chat-panel";

export default function AppLayout() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside
        data-objects
        className="flex min-h-0 flex-col border-b border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900 p-6 md:border-r md:border-b-0"
      >
        <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden pr-1">
          <ScrollArea.Viewport className="h-full w-full">
            <CanvasItemsList />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            className="flex w-2.5 touch-none select-none bg-transparent p-0.5"
            orientation="vertical"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-700" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
        <AIChatPanel />
      </aside>
      <main className="flex min-h-0 flex-col  max-h-screen">
        <EditorCanvas />
      </main>
    </div>
  );
}
