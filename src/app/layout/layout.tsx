"use client";

/** Layout.Tsx application layout. */
import { useState } from "react";
import EditorCanvas from "../features/canvas/editor-canvas";
import { LeftUtilityPanel } from "./left-utility-panel";

/** Root app layout with left utility rail and main editor workspace. */
export default function AppLayout() {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(true);

  return (
    <div
      className={`grid min-h-screen w-full grid-cols-1 ${
        isLeftPanelCollapsed
          ? "md:grid-cols-[94px_1fr]"
          : "md:grid-cols-[430px_1fr]"
      }`}
    >
      <div className="z-30 h-full">
        <LeftUtilityPanel
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapsed={() => {
            setIsLeftPanelCollapsed((previous) => !previous);
          }}
        />
      </div>
      <main className="order-1 flex min-h-0 max-h-screen flex-col md:order-2">
        <EditorCanvas />
      </main>
    </div>
  );
}
