/** Use List For Ai Comand.Ts hook logic. */
import type { Canvas } from "fabric";
import { useEffect, type RefObject } from "react";
import { toast } from "sonner";
import {
  AI_EDITOR_COMMAND_EVENT,
  emitAIImageStatus,
  emitAIActionStatus,
  type AIEditorCommand,
} from "../../ai/editor-ai-events";
import {
  generateOpenAIImageDataUrl,
} from "../../ai/openai-chat";
import { compressImageUrlToMaxBytes } from "../../ai/image-size";
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
    addImagePlaceholder,
    addCircle,
    addLine,
    addPolygon,
    addRectangle,
    addText,
    deleteKeyframeById,
    modifyKeyframeById,
    removeItemById,
    reorderLayers,
    replaceItemWithImageFromURL,
    shiftItemTimelines,
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
              shouldSetSelected: false,
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
              shouldSetSelected: false,
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
              shouldSetSelected: false,
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
              shouldSetSelected: false,
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
              shouldSetSelected: false,
              top: command.top,
              width: command.width,
            });
            return;
          }

          if (command.type === 'add_image') {
            const placeholderId = addImagePlaceholder({
              customId: command.customId,
              height: command.height,
              left: command.left,
              right: command.right,
              shouldSetSelected: false,
              top: command.top,
              width: command.width,
            });
            if (!placeholderId) return;

            let optimizedImageUrl: string | null = null;
            try {
              emitAIImageStatus({
                status: 'start',
                ...(command.prompt ? { prompt: command.prompt } : {}),
              });
              const resolvedImageUrl =
                command.url ??
                (command.prompt
                  ? await generateOpenAIImageDataUrl(command.prompt)
                  : null);
              if (!resolvedImageUrl) {
                throw new Error('No image URL or generation prompt provided.');
              }

              const maxBytes = 500 * 1024;
              optimizedImageUrl = await compressImageUrlToMaxBytes(
                resolvedImageUrl,
                maxBytes,
              );
              await replaceItemWithImageFromURL(placeholderId, optimizedImageUrl, {
                customId: placeholderId,
                height: command.height,
                keyframes: command.keyframes,
                left: command.left,
                right: command.right,
                shouldSetSelected: false,
                top: command.top,
                width: command.width,
              });
            } catch (error) {
              removeItemById(placeholderId);
              throw error;
            } finally {
              if (optimizedImageUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(optimizedImageUrl);
              }
              emitAIImageStatus({
                status: 'end',
                ...(command.prompt ? { prompt: command.prompt } : {}),
              });
            }
            return;
          }

          if (command.type === "set_aspect_ratio") {
            onSetAspectRatio?.(command.aspectLabel);
            return;
          }

          if (command.type === 'modify_keyframe') {
            modifyKeyframeById(command.keyframeId, {
              ...(command.easing ? { easing: command.easing } : {}),
              ...(typeof command.time === 'number' ? { time: command.time } : {}),
              ...(command.value !== undefined ? { value: command.value } : {}),
            });
            return;
          }

          if (command.type === 'delete_keyframe') {
            deleteKeyframeById(command.keyframeId);
            return;
          }

          if (command.type === 'delete_item') {
            const targetId = command.target.id;
            if (!targetId) return;
            removeItemById(targetId);
            return;
          }

          if (command.type === 'reorder_layers') {
            reorderLayers(command.ids);
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

          if (command.type === 'batch_update_items') {
            command.updates.forEach((update) => {
              updateItemById(update.id, {
                ...(update.keyframes ? { keyframes: update.keyframes } : {}),
                ...(update.props ? { props: update.props } : {}),
              });
            });
            return;
          }

          if (command.type === 'timeline_shift') {
            shiftItemTimelines(command.ids, command.deltaSeconds);
            return;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'AI canvas action failed.';
          toast.error(message);
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
    addImagePlaceholder,
    addLine,
    deleteKeyframeById,
    modifyKeyframeById,
    addPolygon,
    addRectangle,
    addText,
    onSetAspectRatio,
    removeItemById,
    reorderLayers,
    replaceItemWithImageFromURL,
    shiftItemTimelines,
    updateItemById,
  ]);
};
