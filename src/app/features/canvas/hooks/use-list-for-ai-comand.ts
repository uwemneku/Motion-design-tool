/** Use List For Ai Comand.Ts hook logic. */
import type { Canvas } from "fabric";
import { useEffect, type RefObject } from "react";
import {
  AI_EDITOR_COMMAND_EVENT,
  emitAIActionStatus,
  type AIEditorCommand,
} from "../../ai/editor-ai-events";
import { isToolBackedCommand } from "../../ai/tools";
import { useCanvasItems } from "./use-canvas-items";

type UseListForAiComandOptions = {
  onSetAspectRatio?: (aspectLabel: "16:9" | "9:16" | "1:1" | "4:5") => void;
};

/**
 * Listens to AI commands and executes only command types produced by tools.ts.
 */
export const useListForAiComand = (
  fabricCanvas: RefObject<Canvas | null>,
  options: UseListForAiComandOptions = {},
) => {
  const { onSetAspectRatio } = options;
  const {
    addCircle,
    addLine,
    addPolygon,
    addRectangle,
    addText,
    updateItemById,
  } = useCanvasItems({
    fabricCanvas,
  });

  useEffect(() => {
    const onAICommand = (event: Event) => {
      const customEvent = event as CustomEvent<AIEditorCommand>;
      const command = customEvent.detail;
      if (!isToolBackedCommand(command)) return;

      const runCommand = async () => {
        emitAIActionStatus({
          status: "start",
          actionType: command.type,
        });
        try {
          if (command.type === "add_circle") {
            addCircle({
              color: command.color,
              customId: command.customId,
              keyframes: command.keyframes,
              left: command.left,
              radius: command.radius,
              right: command.right,
              top: command.top,
            });
            return;
          }

          if (command.type === "add_rectangle") {
            addRectangle({
              color: command.color,
              customId: command.customId,
              height: command.height,
              keyframes: command.keyframes,
              left: command.left,
              right: command.right,
              top: command.top,
              width: command.width,
            });
            return;
          }

          if (command.type === "add_polygon") {
            addPolygon({
              color: command.color,
              customId: command.customId,
              height: command.height,
              keyframes: command.keyframes,
              left: command.left,
              right: command.right,
              sides: command.sides,
              top: command.top,
              width: command.width,
            });
            return;
          }

          if (command.type === "add_line") {
            addLine({
              color: command.color,
              customId: command.customId,
              height: command.height,
              keyframes: command.keyframes,
              left: command.left,
              right: command.right,
              top: command.top,
              width: command.width,
            });
            return;
          }

          if (command.type === "add_text") {
            addText(command.text ?? "AI text", {
              color: command.color,
              customId: command.customId,
              keyframes: command.keyframes,
              left: command.left,
              right: command.right,
              top: command.top,
              width: command.width,
            });
            return;
          }

          if (command.type === "set_aspect_ratio") {
            onSetAspectRatio?.(command.aspectLabel);
            return;
          }

          if (command.type === "update_item") {
            const targetId = command.target.id;
            if (!targetId) return;
            updateItemById(targetId, {
              ...(command.keyframes ? { keyframes: command.keyframes } : {}),
              ...(command.props ? { props: command.props } : {}),
            });
            return;
          }
        } finally {
          emitAIActionStatus({
            status: "end",
            actionType: command.type,
          });
        }
      };

      void runCommand();
    };

    window.addEventListener(
      AI_EDITOR_COMMAND_EVENT,
      onAICommand as EventListener,
    );
    return () => {
      window.removeEventListener(
        AI_EDITOR_COMMAND_EVENT,
        onAICommand as EventListener,
      );
    };
  }, [
    addCircle,
    addLine,
    addPolygon,
    addRectangle,
    addText,
    onSetAspectRatio,
    updateItemById,
  ]);
};
