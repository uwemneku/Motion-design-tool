/** Editor Ai Events.Ts module implementation. */
import type { KeyframeEasing } from '../shapes/animatable-object/types';

export type AIItemKeyframe = {
  time: number;
  easing?: KeyframeEasing;
  fill?: string;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  angle?: number;
  stroke?: string;
};

export type AIItemTarget = {
  id?: string;
  name?: string;
};

export type AIItemPatch = {
  fill?: string;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  width?: number;
  stroke?: string;
  opacity?: number;
  angle?: number;
  text?: string;
};

export type AIEditorCommand =
  | {
      type: "add_circle";
      color?: string;
      customId?: string;
      left?: number;
      radius?: number;
      right?: number;
      top?: number;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_polygon";
      color?: string;
      customId?: string;
      height?: number;
      left?: number;
      right?: number;
      sides?: number;
      top?: number;
      width?: number;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_line";
      color?: string;
      customId?: string;
      height?: number;
      left?: number;
      right?: number;
      top?: number;
      width?: number;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_rectangle";
      color?: string;
      customId?: string;
      height?: number;
      left?: number;
      right?: number;
      top?: number;
      width?: number;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_text";
      customId?: string;
      left?: number;
      right?: number;
      text?: string;
      color?: string;
      top?: number;
      width?: number;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "add_image";
      customId?: string;
      height?: number;
      left?: number;
      right?: number;
      url?: string;
      prompt?: string;
      top?: number;
      width?: number;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: "update_item";
      target: AIItemTarget;
      props?: AIItemPatch;
      keyframes?: AIItemKeyframe[];
    }
  | {
      type: 'batch_update_items';
      updates: Array<{
        id: string;
        keyframes?: AIItemKeyframe[];
        props?: AIItemPatch;
      }>;
    }
  | {
      type: "delete_item";
      target: AIItemTarget;
    }
  | {
      type: "set_aspect_ratio";
      aspectLabel: "16:9" | "9:16" | "1:1" | "4:5";
    }
  | {
      type: 'reorder_layers';
      ids: string[];
    }
  | {
      type: 'modify_keyframe';
      easing?: KeyframeEasing;
      keyframeId: string;
      time?: number;
      value?: number | string;
    }
  | {
      type: 'delete_keyframe';
      keyframeId: string;
    }
  | {
      type: 'timeline_shift';
      deltaSeconds: number;
      ids: string[];
    };

export const AI_EDITOR_COMMAND_EVENT = "ai-editor-command";
export const AI_IMAGE_STATUS_EVENT = "ai-image-status";
export const AI_ACTION_STATUS_EVENT = "ai-action-status";
export const AI_STEP_COMPLETE_EVENT = 'ai-step-complete';

export type AIImageStatusPayload = {
  status: "start" | "end";
  prompt?: string;
};

export type AIActionStatusPayload = {
  status: "start" | "end";
  actionType?: AIEditorCommand["type"];
};

export type AIStepCompletePayload = {
  step: number;
  toolCount: number;
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

export function emitAIActionStatus(status: AIActionStatusPayload) {
  window.dispatchEvent(
    new CustomEvent<AIActionStatusPayload>(AI_ACTION_STATUS_EVENT, {
      detail: status,
    }),
  );
}

export function emitAIStepComplete(status: AIStepCompletePayload) {
  window.dispatchEvent(
    new CustomEvent<AIStepCompletePayload>(AI_STEP_COMPLETE_EVENT, {
      detail: status,
    }),
  );
}
