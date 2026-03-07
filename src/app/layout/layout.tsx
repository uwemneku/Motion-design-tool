"use client";

/** Layout.Tsx application layout. */
import EditorCanvas from "../features/canvas/editor-canvas";

/** Root app layout with a full-width editor workspace. */
export default function AppLayout() {
  return (
    <div className="min-h-screen w-full">
      <main className="flex min-h-screen max-h-screen flex-col">
        <EditorCanvas />
      </main>
    </div>
  );
}
