"use client";

/** Layout.Tsx application layout. */
import EditorCanvas from "../features/canvas/editor-canvas";

/** Root app layout with a full-width editor workspace. */
export default function AppLayout() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <main className="flex h-full flex-col overflow-hidden">
        <EditorCanvas />
      </main>
    </div>
  );
}
