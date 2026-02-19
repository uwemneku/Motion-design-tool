/** Tools.Ts AI tool-call schemas and command mapping. */
import { z } from 'zod';
import type { AIEditorCommand } from './editor-ai-events';
import type { OpenAISceneContext } from './openai-chat';

const addCircleToolCallSchema = z
  .object({
    args: z
      .object({
        color: z.string().nullable(),
        left: z.number().nullable(),
        radius: z.number().nullable(),
        right: z.number().nullable(),
        top: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('add_circle'),
  })
  .strict();

const addRectangleToolCallSchema = z
  .object({
    args: z
      .object({
        color: z.string().nullable(),
        height: z.number().nullable(),
        left: z.number().nullable(),
        right: z.number().nullable(),
        top: z.number().nullable(),
        width: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('add_rectangle'),
  })
  .strict();

const addTextToolCallSchema = z
  .object({
    args: z
      .object({
        color: z.string().nullable(),
        left: z.number().nullable(),
        right: z.number().nullable(),
        text: z.string().nullable(),
        top: z.number().nullable(),
        width: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('add_text'),
  })
  .strict();

const addPolygonToolCallSchema = z
  .object({
    args: z
      .object({
        color: z.string().nullable(),
        height: z.number().nullable(),
        left: z.number().nullable(),
        right: z.number().nullable(),
        sides: z.number().nullable(),
        top: z.number().nullable(),
        width: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('add_polygon'),
  })
  .strict();

const addLineToolCallSchema = z
  .object({
    args: z
      .object({
        color: z.string().nullable(),
        height: z.number().nullable(),
        left: z.number().nullable(),
        right: z.number().nullable(),
        top: z.number().nullable(),
        width: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('add_line'),
  })
  .strict();

const setVideoAspectRatioToolCallSchema = z
  .object({
    args: z
      .object({
        aspectLabel: z.enum(['16:9', '9:16', '1:1', '4:5']),
      })
      .strict(),
    tool: z.literal('set_video_aspect_ratio'),
  })
  .strict();

const updateItemByIdToolCallSchema = z
  .object({
    args: z
      .object({
        id: z.string().min(1),
        keyframes: z
          .array(
            z
              .object({
                angle: z.number().nullable(),
                easing: z
                  .enum([
                    'linear',
                    'easeIn',
                    'easeOut',
                    'easeInOut',
                    'elastic',
                    'bounce',
                  ])
                  .nullable(),
                fill: z.string().nullable(),
                left: z.number().nullable(),
                opacity: z.number().nullable(),
                scaleX: z.number().nullable(),
                scaleY: z.number().nullable(),
                stroke: z.string().nullable(),
                time: z.number(),
                top: z.number().nullable(),
              })
              .strict(),
          )
          .nullable(),
        props: z
          .object({
            angle: z.number().nullable(),
            fill: z.string().nullable(),
            left: z.number().nullable(),
            opacity: z.number().nullable(),
            scaleX: z.number().nullable(),
            scaleY: z.number().nullable(),
            stroke: z.string().nullable(),
            text: z.string().nullable(),
            top: z.number().nullable(),
            width: z.number().nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    tool: z.literal('update_item_by_id'),
  })
  .strict();

export const toolCallSchema = z.union([
  addCircleToolCallSchema,
  addLineToolCallSchema,
  addPolygonToolCallSchema,
  addRectangleToolCallSchema,
  addTextToolCallSchema,
  setVideoAspectRatioToolCallSchema,
  updateItemByIdToolCallSchema,
]);

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ToolBackedCommand = Extract<
  AIEditorCommand,
  {
    type:
      | 'add_circle'
      | 'add_line'
      | 'add_polygon'
      | 'add_rectangle'
      | 'add_text'
      | 'update_item'
      | 'set_aspect_ratio';
  }
>;

export const AVAILABLE_TOOLS_PROMPT_TEXT =
  'add_circle(color?, left?, right?, top?, radius?), ' +
  'add_polygon(color?, left?, right?, top?, width?, height?, sides?), ' +
  'add_line(color?, left?, right?, top?, width?, height?), ' +
  'add_rectangle(color?, left?, right?, top?, width?, height?), ' +
  'add_text(text?, color?, left?, right?, top?, width?), ' +
  'update_item_by_id(id, props?, keyframes?), ' +
  'set_video_aspect_ratio(aspectLabel)';

/** Runtime guard for commands supported by the current tool layer. */
export function isToolBackedCommand(
  command: AIEditorCommand,
): command is ToolBackedCommand {
  return (
    command.type === 'add_circle' ||
    command.type === 'add_line' ||
    command.type === 'add_polygon' ||
    command.type === 'add_rectangle' ||
    command.type === 'add_text' ||
    command.type === 'update_item' ||
    command.type === 'set_aspect_ratio'
  );
}

/** Applies one tool call to local working scene and returns a frontend command. */
export function applyToolCallToWorkingScene(
  toolCall: ToolCall,
  nextGeneratedId: () => string,
  workingScene: OpenAISceneContext,
): ToolBackedCommand | null {
  if (toolCall.tool === 'update_item_by_id') {
    const itemId = toolCall.args.id.trim();
    if (itemId.length === 0) return null;
    const existingItem = workingScene.items.find((item) => item.id === itemId);
    if (!existingItem) return null;

    const props = toolCall.args.props
      ? {
          ...(typeof sanitizeNumber(toolCall.args.props.angle) === 'number'
            ? { angle: sanitizeNumber(toolCall.args.props.angle) }
            : {}),
          ...(sanitizeColor(toolCall.args.props.fill)
            ? { fill: sanitizeColor(toolCall.args.props.fill) }
            : {}),
          ...(typeof sanitizeNumber(toolCall.args.props.left) === 'number'
            ? { left: sanitizeNumber(toolCall.args.props.left) }
            : {}),
          ...(typeof sanitizeNumber(toolCall.args.props.opacity) === 'number'
            ? { opacity: sanitizeNumber(toolCall.args.props.opacity) }
            : {}),
          ...(typeof sanitizeNumber(toolCall.args.props.scaleX) === 'number'
            ? { scaleX: sanitizeNumber(toolCall.args.props.scaleX) }
            : {}),
          ...(typeof sanitizeNumber(toolCall.args.props.scaleY) === 'number'
            ? { scaleY: sanitizeNumber(toolCall.args.props.scaleY) }
            : {}),
          ...(sanitizeColor(toolCall.args.props.stroke)
            ? { stroke: sanitizeColor(toolCall.args.props.stroke) }
            : {}),
          ...(sanitizeText(toolCall.args.props.text)
            ? { text: sanitizeText(toolCall.args.props.text) }
            : {}),
          ...(typeof sanitizeNumber(toolCall.args.props.top) === 'number'
            ? { top: sanitizeNumber(toolCall.args.props.top) }
            : {}),
          ...(typeof sanitizeNumber(toolCall.args.props.width) === 'number'
            ? { width: sanitizeNumber(toolCall.args.props.width) }
            : {}),
        }
      : undefined;

    const keyframes = (toolCall.args.keyframes ?? [])
      .map((frame) => ({
        angle: sanitizeNumber(frame.angle),
        easing: frame.easing ?? undefined,
        fill: sanitizeColor(frame.fill),
        left: sanitizeNumber(frame.left),
        opacity: sanitizeNumber(frame.opacity),
        scaleX: sanitizeNumber(frame.scaleX),
        scaleY: sanitizeNumber(frame.scaleY),
        stroke: sanitizeColor(frame.stroke),
        time: sanitizeNumber(frame.time),
        top: sanitizeNumber(frame.top),
      }))
      .filter((frame) => typeof frame.time === 'number')
      .map((frame) => ({
        ...(typeof frame.angle === 'number' ? { angle: frame.angle } : {}),
        ...(frame.easing ? { easing: frame.easing } : {}),
        ...(frame.fill ? { fill: frame.fill } : {}),
        ...(typeof frame.left === 'number' ? { left: frame.left } : {}),
        ...(typeof frame.opacity === 'number' ? { opacity: frame.opacity } : {}),
        ...(typeof frame.scaleX === 'number' ? { scaleX: frame.scaleX } : {}),
        ...(typeof frame.scaleY === 'number' ? { scaleY: frame.scaleY } : {}),
        ...(frame.stroke ? { stroke: frame.stroke } : {}),
        time: Number(frame.time),
        ...(typeof frame.top === 'number' ? { top: frame.top } : {}),
      }));

    return {
      type: 'update_item',
      target: {
        id: itemId,
      },
      ...(props ? { props } : {}),
      ...(keyframes.length > 0 ? { keyframes } : {}),
    };
  }

  if (toolCall.tool === 'set_video_aspect_ratio') {
    const nextAspectLabel = toolCall.args.aspectLabel;
    const nextAspectRatioByLabel: Record<
      '16:9' | '9:16' | '1:1' | '4:5',
      number
    > = {
      '16:9': 16 / 9,
      '9:16': 9 / 16,
      '1:1': 1,
      '4:5': 4 / 5,
    };

    if (workingScene.project) {
      workingScene.project.videoAspectLabel = nextAspectLabel;
      workingScene.project.videoAspectRatio =
        nextAspectRatioByLabel[nextAspectLabel];
    }

    return {
      type: 'set_aspect_ratio',
      aspectLabel: nextAspectLabel,
    };
  }

  if (toolCall.tool === 'add_rectangle') {
    const id = nextGeneratedId();
    const color = sanitizeColor(toolCall.args.color);
    const height = sanitizeNumber(toolCall.args.height);
    const left = sanitizeNumber(toolCall.args.left);
    const right = sanitizeNumber(toolCall.args.right);
    const top = sanitizeNumber(toolCall.args.top);
    const width = sanitizeNumber(toolCall.args.width);
    const command: ToolBackedCommand = {
      type: 'add_rectangle',
      customId: id,
      ...(color ? { color } : {}),
      ...(typeof height === 'number' ? { height } : {}),
      ...(typeof left === 'number' ? { left } : {}),
      ...(typeof right === 'number' ? { right } : {}),
      ...(typeof top === 'number' ? { top } : {}),
      ...(typeof width === 'number' ? { width } : {}),
    };

    workingScene.items.push({
      id,
      keyframeTimes: [0],
      name: 'rectangle',
    });
    workingScene.selectedId = id;

    return command;
  }

  if (toolCall.tool === 'add_polygon') {
    const id = nextGeneratedId();
    const color = sanitizeColor(toolCall.args.color);
    const height = sanitizeNumber(toolCall.args.height);
    const left = sanitizeNumber(toolCall.args.left);
    const right = sanitizeNumber(toolCall.args.right);
    const sides = sanitizeNumber(toolCall.args.sides);
    const top = sanitizeNumber(toolCall.args.top);
    const width = sanitizeNumber(toolCall.args.width);
    const command: ToolBackedCommand = {
      type: 'add_polygon',
      customId: id,
      ...(color ? { color } : {}),
      ...(typeof height === 'number' ? { height } : {}),
      ...(typeof left === 'number' ? { left } : {}),
      ...(typeof right === 'number' ? { right } : {}),
      ...(typeof sides === 'number' ? { sides } : {}),
      ...(typeof top === 'number' ? { top } : {}),
      ...(typeof width === 'number' ? { width } : {}),
    };

    workingScene.items.push({
      id,
      keyframeTimes: [0],
      name: 'polygon',
    });
    workingScene.selectedId = id;

    return command;
  }

  if (toolCall.tool === 'add_line') {
    const id = nextGeneratedId();
    const color = sanitizeColor(toolCall.args.color);
    const height = sanitizeNumber(toolCall.args.height);
    const left = sanitizeNumber(toolCall.args.left);
    const right = sanitizeNumber(toolCall.args.right);
    const top = sanitizeNumber(toolCall.args.top);
    const width = sanitizeNumber(toolCall.args.width);
    const command: ToolBackedCommand = {
      type: 'add_line',
      customId: id,
      ...(color ? { color } : {}),
      ...(typeof height === 'number' ? { height } : {}),
      ...(typeof left === 'number' ? { left } : {}),
      ...(typeof right === 'number' ? { right } : {}),
      ...(typeof top === 'number' ? { top } : {}),
      ...(typeof width === 'number' ? { width } : {}),
    };

    workingScene.items.push({
      id,
      keyframeTimes: [0],
      name: 'line',
    });
    workingScene.selectedId = id;

    return command;
  }

  if (toolCall.tool === 'add_text') {
    const id = nextGeneratedId();
    const color = sanitizeColor(toolCall.args.color);
    const left = sanitizeNumber(toolCall.args.left);
    const right = sanitizeNumber(toolCall.args.right);
    const text = sanitizeText(toolCall.args.text);
    const top = sanitizeNumber(toolCall.args.top);
    const width = sanitizeNumber(toolCall.args.width);
    const command: ToolBackedCommand = {
      type: 'add_text',
      customId: id,
      ...(color ? { color } : {}),
      ...(typeof left === 'number' ? { left } : {}),
      ...(typeof right === 'number' ? { right } : {}),
      ...(text ? { text } : {}),
      ...(typeof top === 'number' ? { top } : {}),
      ...(typeof width === 'number' ? { width } : {}),
    };

    workingScene.items.push({
      id,
      keyframeTimes: [0],
      name: 'text',
    });
    workingScene.selectedId = id;

    return command;
  }

  if (toolCall.tool !== 'add_circle') {
    return null;
  }

  const id = nextGeneratedId();
  const color = sanitizeColor(toolCall.args.color);
  const left = sanitizeNumber(toolCall.args.left);
  const radius = sanitizeNumber(toolCall.args.radius);
  const right = sanitizeNumber(toolCall.args.right);
  const top = sanitizeNumber(toolCall.args.top);
  const command: AIEditorCommand = {
    type: 'add_circle',
    customId: id,
    ...(color ? { color } : {}),
    ...(typeof left === 'number' ? { left } : {}),
    ...(typeof radius === 'number' ? { radius } : {}),
    ...(typeof right === 'number' ? { right } : {}),
    ...(typeof top === 'number' ? { top } : {}),
  };

  workingScene.items.push({
    id,
    keyframeTimes: [0],
    name: 'circle',
  });
  workingScene.selectedId = id;

  return command;
}

/** Normalizes optional color argument into a safe string. */
function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Normalizes optional text argument into a safe string. */
function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Normalizes optional numeric argument into a finite number. */
function sanitizeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
