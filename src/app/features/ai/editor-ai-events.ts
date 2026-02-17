export type AIItemKeyframe = {
  time: number;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  angle?: number;
};

export type AIItemTarget = {
  id?: string;
  name?: string;
};

export type AIItemPatch = {
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  angle?: number;
  text?: string;
};

export type AIEditorCommand =
  | {
      type: "add_circle";
      color?: string;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_polygon";
      color?: string;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_line";
      color?: string;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_rectangle";
      color?: string;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_text";
      text?: string;
      color?: string;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_image";
      url?: string;
      prompt?: string;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "update_item";
      target: AIItemTarget;
      props?: AIItemPatch;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "delete_item";
      target: AIItemTarget;
    };

export const AI_EDITOR_COMMAND_EVENT = "ai-editor-command";
export const AI_IMAGE_STATUS_EVENT = "ai-image-status";

export type AIImageStatusPayload = {
  status: "start" | "end";
  prompt?: string;
};

export function emitAIEditorCommand(command: AIEditorCommand) {
  window.dispatchEvent(
    new CustomEvent<AIEditorCommand>(AI_EDITOR_COMMAND_EVENT, {
      detail: command,
    }),
  );
}

export function emitAIImageStatus(status: AIImageStatusPayload) {
  window.dispatchEvent(
    new CustomEvent<AIImageStatusPayload>(AI_IMAGE_STATUS_EVENT, {
      detail: status,
    }),
  );
}
