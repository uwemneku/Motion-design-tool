/** Layout.Tsx application layout. */
import { AppScrollArea } from "../components/app-scroll-area";
import EditorCanvas from "../features/canvas/editor-canvas";
import CanvasItemsList from "../features/canvas/items-list/canvas-items-list";
import AIChatPanel from "../features/ai/ai-chat-panel";

/** Root app layout with left utility rail and main editor workspace. */
export default function AppLayout() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside
        data-objects
        className="order-2 flex min-h-0 max-h-dvh flex-col border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-4 md:order-1 md:max-h-none md:border-r md:border-b-0 md:p-6"
        style={{ maxHeight: "100dvh" }}
      >
        <AppScrollArea
          rootClassName="min-h-0 flex-1 overflow-hidden pr-1"
          viewportClassName="h-full w-full"
          verticalScrollbarClassName="flex w-2.5 touch-none select-none bg-transparent p-0.5"
        >
          <div className="h-full w-full">
            <CanvasItemsList />
          </div>
        </AppScrollArea>
        <AIChatPanel />
      </aside>
      <main className="order-1 flex min-h-0 max-h-screen flex-col md:order-2">
        <EditorCanvas />
      </main>
    </div>
  );
}
