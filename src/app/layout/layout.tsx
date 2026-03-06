"use client";

/** Layout.Tsx application layout. */
import EditorCanvas from "../features/canvas/editor-canvas";
import { LeftUtilityPanel } from "./left-utility-panel";

/** Root app layout with left utility rail and main editor workspace. */
export default function AppLayout() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[280px_1fr]">
      <div className="z-30 h-full">
        <LeftUtilityPanel />
      </div>
      <main className="order-1 flex min-h-0 max-h-screen flex-col md:order-2">
        <EditorCanvas />
      </main>
    </div>
  );
}
