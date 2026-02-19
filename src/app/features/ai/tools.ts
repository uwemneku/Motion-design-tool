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

const addImageToolCallSchema = z
  .object({
    args: z
      .object({
        height: z.number().nullable(),
        left: z.number().nullable(),
        prompt: z.string().nullable(),
        right: z.number().nullable(),
        top: z.number().nullable(),
        url: z.string().nullable(),
        width: z.number().nullable(),
      })
      .strict()
      .refine((args) => args.prompt || args.url, {
        message: 'Either prompt or url is required.',
      }),
    tool: z.literal('add_image'),
  })
  .strict();

const getLayerOrderToolCallSchema = z
  .object({
    args: z.object({}).strict(),
    tool: z.literal('get_layer_order'),
  })
  .strict();

const findTextSlotToolCallSchema = z
  .object({
    args: z
      .object({
        height: z.number().nullable(),
        padding: z.number().nullable(),
        preferredTop: z.number().nullable(),
        width: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('find_text_slot'),
  })
  .strict();

const analyzeSceneOverlapsToolCallSchema = z
  .object({
    args: z
      .object({
        padding: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('analyze_scene_overlaps'),
  })
  .strict();

const getItemsInVideoAreaToolCallSchema = z
  .object({
    args: z
      .object({
        visibleOnly: z.boolean().nullable(),
      })
      .strict(),
    tool: z.literal('get_items_in_video_area'),
  })
  .strict();

const getItemGeometryToolCallSchema = z
  .object({
    args: z
      .object({
        ids: z.array(z.string().min(1)).nullable(),
      })
      .strict(),
    tool: z.literal('get_item_geometry'),
  })
  .strict();

const reorderLayersToolCallSchema = z
  .object({
    args: z
      .object({
        ids: z.array(z.string().min(1)),
      })
      .strict(),
    tool: z.literal('reorder_layers'),
  })
  .strict();

const modifyKeyframeByIdToolCallSchema = z
  .object({
    args: z
      .object({
        easing: z
          .enum([
            'linear',
            'step',
            'easeIn',
            'easeOut',
            'easeInOut',
            'elastic',
            'bounce',
          ])
          .nullable(),
        keyframeId: z.string().min(1),
        time: z.number().nullable(),
        valueNumber: z.number().nullable(),
        valueString: z.string().nullable(),
      })
      .strict(),
    tool: z.literal('modify_keyframe_by_id'),
  })
  .strict();

const deleteKeyframeByIdToolCallSchema = z
  .object({
    args: z
      .object({
        keyframeId: z.string().min(1),
      })
      .strict(),
    tool: z.literal('delete_keyframe_by_id'),
  })
  .strict();

const deleteItemByIdToolCallSchema = z
  .object({
    args: z
      .object({
        id: z.string().min(1),
      })
      .strict(),
    tool: z.literal('delete_item_by_id'),
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
                    'step',
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

const batchUpdateItemsToolCallSchema = z
  .object({
    args: z
      .object({
        updates: z.array(
          z
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
                          'step',
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
        ),
      })
      .strict(),
    tool: z.literal('batch_update_items'),
  })
  .strict();

const createTextLayoutToolCallSchema = z
  .object({
    args: z
      .object({
        blocks: z.array(
          z
            .object({
              id: z.string().min(1),
              height: z.number().nullable(),
              width: z.number().nullable(),
            })
            .strict(),
        ),
        region: z
          .object({
            padding: z.number().nullable(),
            topBias: z.number().nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    tool: z.literal('create_text_layout'),
  })
  .strict();

const resolveOverlapsToolCallSchema = z
  .object({
    args: z
      .object({
        padding: z.number().nullable(),
        strategy: z.enum(['opacity_stage', 'none']),
      })
      .strict(),
    tool: z.literal('resolve_overlaps'),
  })
  .strict();

const duplicateItemToolCallSchema = z
  .object({
    args: z
      .object({
        id: z.string().min(1),
        left: z.number().nullable(),
        top: z.number().nullable(),
      })
      .strict(),
    tool: z.literal('duplicate_item'),
  })
  .strict();

const timelineShiftToolCallSchema = z
  .object({
    args: z
      .object({
        deltaSeconds: z.number(),
        ids: z.array(z.string().min(1)),
      })
      .strict(),
    tool: z.literal('timeline_shift'),
  })
  .strict();

export const toolCallSchema = z.union([
  addCircleToolCallSchema,
  addImageToolCallSchema,
  analyzeSceneOverlapsToolCallSchema,
  batchUpdateItemsToolCallSchema,
  createTextLayoutToolCallSchema,
  deleteKeyframeByIdToolCallSchema,
  deleteItemByIdToolCallSchema,
  duplicateItemToolCallSchema,
  findTextSlotToolCallSchema,
  getItemGeometryToolCallSchema,
  getItemsInVideoAreaToolCallSchema,
  modifyKeyframeByIdToolCallSchema,
  getLayerOrderToolCallSchema,
  addLineToolCallSchema,
  addPolygonToolCallSchema,
  addRectangleToolCallSchema,
  reorderLayersToolCallSchema,
  resolveOverlapsToolCallSchema,
  addTextToolCallSchema,
  setVideoAspectRatioToolCallSchema,
  timelineShiftToolCallSchema,
  updateItemByIdToolCallSchema,
]);

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ToolBackedCommand = Extract<
  AIEditorCommand,
  {
    type:
      | 'add_circle'
      | 'add_line'
      | 'add_image'
      | 'add_polygon'
      | 'add_rectangle'
      | 'add_text'
      | 'delete_item'
      | 'delete_keyframe'
      | 'modify_keyframe'
      | 'reorder_layers'
      | 'update_item'
      | 'set_aspect_ratio'
      | 'batch_update_items'
      | 'timeline_shift';
  }
>;

export const AVAILABLE_TOOLS_PROMPT_TEXT =
  'add_circle(color?, left?, right?, top?, radius?), ' +
  'add_polygon(color?, left?, right?, top?, width?, height?, sides?), ' +
  'add_line(color?, left?, right?, top?, width?, height?), ' +
  'add_image(prompt?, url?, left?, right?, top?, width?, height?), ' +
  'get_layer_order(), ' +
  'analyze_scene_overlaps(padding?), ' +
  'get_items_in_video_area(visibleOnly?), ' +
  'get_item_geometry(ids?), ' +
  'find_text_slot(width?, height?, preferredTop?, padding?), ' +
  'create_text_layout(blocks, region?), ' +
  'add_rectangle(color?, left?, right?, top?, width?, height?), ' +
  'delete_item_by_id(id), ' +
  'modify_keyframe_by_id(keyframeId, valueNumber?, valueString?, easing?, time?), ' +
  'delete_keyframe_by_id(keyframeId), ' +
  'reorder_layers(ids), ' +
  'duplicate_item(id, left?, top?), ' +
  'resolve_overlaps(strategy, padding?), ' +
  'batch_update_items(updates), ' +
  'timeline_shift(ids, deltaSeconds), ' +
  'add_text(text?, color?, left?, right?, top?, width?), ' +
  'update_item_by_id(id, props?, keyframes?), ' +
  'set_video_aspect_ratio(aspectLabel)';

/** Runtime guard for commands supported by the current tool layer. */
export function isToolBackedCommand(
  command: AIEditorCommand,
): command is ToolBackedCommand {
  return (
    command.type === 'add_circle' ||
    command.type === 'add_image' ||
    command.type === 'add_line' ||
    command.type === 'add_polygon' ||
    command.type === 'add_rectangle' ||
    command.type === 'delete_item' ||
    command.type === 'delete_keyframe' ||
    command.type === 'modify_keyframe' ||
    command.type === 'reorder_layers' ||
    command.type === 'add_text' ||
    command.type === 'update_item' ||
    command.type === 'set_aspect_ratio' ||
    command.type === 'batch_update_items' ||
    command.type === 'timeline_shift'
  );
}

/** Returns current layer order (top-most first) from working scene. */
export function getLayerOrderFromScene(workingScene: OpenAISceneContext) {
  return workingScene.items.map((item) => item.id);
}

type Rect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type FindTextSlotArgs = {
  height?: number | null;
  padding?: number | null;
  preferredTop?: number | null;
  width?: number | null;
};

/** Finds a non-overlapping text center position inside the video area. */
export function findTextSlotFromScene(
  workingScene: OpenAISceneContext,
  args: FindTextSlotArgs = {},
) {
  const project = workingScene.project;
  if (!project) {
    return {
      left: null,
      top: null,
    };
  }

  const padding = Math.max(0, sanitizeNumber(args.padding) ?? 16);
  const width = Math.max(40, sanitizeNumber(args.width) ?? project.videoWidth * 0.4);
  const height = Math.max(20, sanitizeNumber(args.height) ?? 64);

  const safeLeftBound = project.videoLeft + padding + width / 2;
  const safeRightBound = project.videoRight - padding - width / 2;
  const safeTopBound = project.videoTop + padding + height / 2;
  const safeBottomBound = project.videoBottom - padding - height / 2;

  if (safeLeftBound > safeRightBound || safeTopBound > safeBottomBound) {
    return {
      left: project.videoLeft + project.videoWidth / 2,
      top: project.videoTop + project.videoHeight / 2,
    };
  }

  const textRects: Rect[] = workingScene.items
    .filter((item) => item.name === 'text' || Boolean(item.text))
    .map((item) => {
      const bounds = item.current?.bounds;
      if (bounds) {
        return {
          bottom: bounds.bottom,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
        };
      }

      const centerX = item.current?.left;
      const centerY = item.current?.top;
      const itemWidth =
        item.current?.scaledWidth ?? item.current?.width ?? width;
      const itemHeight =
        item.current?.scaledHeight ?? item.current?.height ?? height;
      if (
        typeof centerX !== 'number' ||
        typeof centerY !== 'number' ||
        !Number.isFinite(centerX) ||
        !Number.isFinite(centerY)
      ) {
        return null;
      }
      return {
        bottom: centerY + itemHeight / 2,
        left: centerX - itemWidth / 2,
        right: centerX + itemWidth / 2,
        top: centerY - itemHeight / 2,
      };
    })
    .filter((rect): rect is Rect => Boolean(rect));

  const preferredTop = sanitizeNumber(args.preferredTop);
  const centerX = project.videoLeft + project.videoWidth / 2;
  const topY = project.videoTop + project.videoHeight * 0.22;
  const midY = project.videoTop + project.videoHeight * 0.5;
  const bottomY = project.videoTop + project.videoHeight * 0.78;
  const leftX = project.videoLeft + project.videoWidth * 0.3;
  const rightX = project.videoLeft + project.videoWidth * 0.7;

  const yCandidates = [
    ...(typeof preferredTop === 'number' && Number.isFinite(preferredTop)
      ? [preferredTop]
      : []),
    topY,
    midY,
    bottomY,
    safeTopBound,
    safeBottomBound,
  ];
  const xCandidates = [centerX, leftX, rightX, safeLeftBound, safeRightBound];

  const toRect = (left: number, top: number): Rect => ({
    bottom: top + height / 2,
    left: left - width / 2,
    right: left + width / 2,
    top: top - height / 2,
  });

  const intersects = (a: Rect, b: Rect) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  const clampCenter = (x: number, y: number) => ({
    left: Math.max(safeLeftBound, Math.min(safeRightBound, x)),
    top: Math.max(safeTopBound, Math.min(safeBottomBound, y)),
  });

  for (const y of yCandidates) {
    for (const x of xCandidates) {
      const clamped = clampCenter(x, y);
      const candidate = toRect(clamped.left, clamped.top);
      const overlaps = textRects.some((rect) => intersects(candidate, rect));
      if (!overlaps) {
        return clamped;
      }
    }
  }

  return {
    left: centerX,
    top: Math.max(safeTopBound, Math.min(safeBottomBound, preferredTop ?? midY)),
  };
}

type OverlapItem = {
  id: string;
  hasInitialOpacityZero: boolean;
  hasOpacityKeyframes: boolean;
  name: string;
  opacityNow: number;
};

type OverlapResult = {
  overlapCount: number;
  overlaps: Array<{
    a: OverlapItem;
    b: OverlapItem;
    likelyNeedsOpacityStaging: boolean;
  }>;
};

/** Detects current visual overlaps and exposes opacity-keyframe hints for staging. */
export function analyzeSceneOverlapsFromScene(
  workingScene: OpenAISceneContext,
  padding: number = 0,
): OverlapResult {
  const pad = Math.max(0, Number.isFinite(padding) ? padding : 0);
  const overlaps: OverlapResult['overlaps'] = [];

  const visualItems = workingScene.items
    .map((item) => {
      const bounds = item.current?.bounds;
      if (!bounds) return null;
      const opacityNow =
        typeof item.current?.opacity === 'number' ? item.current.opacity : 1;
      if (opacityNow <= 0.01) return null;

      const opacityFrames = item.keyframes?.opacity ?? [];
      const hasInitialOpacityZero = opacityFrames.some(
        (frame) => Math.abs(frame.time) <= 0.0001 && frame.value <= 0.01,
      );
      return {
        bounds: {
          bottom: bounds.bottom + pad,
          left: bounds.left - pad,
          right: bounds.right + pad,
          top: bounds.top - pad,
        },
        meta: {
          hasInitialOpacityZero,
          hasOpacityKeyframes: opacityFrames.length > 0,
          id: item.id,
          name: item.name,
          opacityNow,
        } satisfies OverlapItem,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        bounds: Rect;
        meta: OverlapItem;
      } => Boolean(entry),
    );

  const intersects = (a: Rect, b: Rect) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  for (let i = 0; i < visualItems.length; i += 1) {
    for (let j = i + 1; j < visualItems.length; j += 1) {
      const a = visualItems[i];
      const b = visualItems[j];
      if (!intersects(a.bounds, b.bounds)) continue;

      overlaps.push({
        a: a.meta,
        b: b.meta,
        likelyNeedsOpacityStaging:
          !a.meta.hasOpacityKeyframes || !b.meta.hasOpacityKeyframes,
      });
    }
  }

  return {
    overlapCount: overlaps.length,
    overlaps,
  };
}

/** Lists item IDs currently intersecting the video area rectangle. */
export function getItemsInVideoAreaFromScene(
  workingScene: OpenAISceneContext,
  visibleOnly: boolean = false,
) {
  const project = workingScene.project;
  if (!project) {
    return {
      ids: [],
    };
  }

  const videoRect: Rect = {
    bottom: project.videoBottom,
    left: project.videoLeft,
    right: project.videoRight,
    top: project.videoTop,
  };

  const intersects = (a: Rect, b: Rect) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  const ids = workingScene.items
    .filter((item) => {
      const bounds = getItemBounds(item);
      if (!bounds) return false;
      if (visibleOnly && (item.current?.opacity ?? 1) <= 0.01) return false;
      return intersects(bounds, videoRect);
    })
    .map((item) => item.id);

  return {
    ids,
  };
}

/** Returns compact geometry snapshots for either requested IDs or all items. */
export function getItemGeometryFromScene(
  workingScene: OpenAISceneContext,
  ids?: string[] | null,
) {
  const idFilter = ids
    ? new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))
    : null;

  return {
    items: workingScene.items
      .filter((item) => (idFilter ? idFilter.has(item.id) : true))
      .map((item) => ({
        id: item.id,
        name: item.name,
        opacity: item.current?.opacity ?? 1,
        ...(getItemBounds(item) ? { bounds: getItemBounds(item) } : {}),
        ...(typeof item.current?.left === 'number' &&
        typeof item.current?.top === 'number'
          ? {
              center: {
                x: item.current.left,
                y: item.current.top,
              },
            }
          : {}),
      })),
  };
}

type TextLayoutArgs = {
  blocks: Array<{
    height?: number | null;
    id: string;
    width?: number | null;
  }>;
  region?: {
    padding?: number | null;
    topBias?: number | null;
  } | null;
};

/** Computes non-overlapping text block placements inside the video area. */
export function createTextLayoutFromScene(
  workingScene: OpenAISceneContext,
  args: TextLayoutArgs,
) {
  const regionPadding = sanitizeNumber(args.region?.padding) ?? 16;
  const topBias = sanitizeNumber(args.region?.topBias) ?? 0.2;

  const layouts = args.blocks.map((block, index) => {
    const slot = findTextSlotFromScene(workingScene, {
      height: block.height ?? 64,
      padding: regionPadding,
      preferredTop:
        typeof workingScene.project?.videoTop === 'number' &&
        typeof workingScene.project?.videoHeight === 'number'
          ? workingScene.project.videoTop +
            workingScene.project.videoHeight *
              Math.min(0.9, Math.max(0.1, topBias + index * 0.2))
          : undefined,
      width: block.width ?? 320,
    });
    return {
      id: block.id,
      left: slot.left,
      top: slot.top,
      width: block.width ?? 320,
    };
  });

  return {
    layouts,
  };
}

/** Resolves rectangular bounds for an item from explicit bounds or size/center. */
function getItemBounds(item: OpenAISceneContext['items'][number]) {
  const bounds = item.current?.bounds;
  if (bounds) {
    return {
      bottom: bounds.bottom,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
    };
  }

  const centerX = item.current?.left;
  const centerY = item.current?.top;
  const scaledWidth = item.current?.scaledWidth ?? item.current?.width;
  const scaledHeight = item.current?.scaledHeight ?? item.current?.height;
  if (
    typeof centerX !== 'number' ||
    typeof centerY !== 'number' ||
    typeof scaledWidth !== 'number' ||
    typeof scaledHeight !== 'number'
  ) {
    return null;
  }

  return {
    bottom: centerY + scaledHeight / 2,
    left: centerX - scaledWidth / 2,
    right: centerX + scaledWidth / 2,
    top: centerY - scaledHeight / 2,
  };
}

/** Applies one tool call to local working scene and returns a frontend command. */
export function applyToolCallToWorkingScene(
  toolCall: ToolCall,
  nextGeneratedId: () => string,
  workingScene: OpenAISceneContext,
): ToolBackedCommand | null {
  if (toolCall.tool === 'modify_keyframe_by_id') {
    const keyframeId = toolCall.args.keyframeId.trim();
    if (keyframeId.length === 0) return null;

    const easing = toolCall.args.easing ?? undefined;
    const time = sanitizeNumber(toolCall.args.time);
    const valueNumber = sanitizeNumber(toolCall.args.valueNumber);
    const valueString = sanitizeText(toolCall.args.valueString);
    const value =
      typeof valueNumber === 'number'
        ? valueNumber
        : valueString
          ? valueString
          : undefined;

    if (
      value === undefined &&
      easing === undefined &&
      typeof time !== 'number'
    ) {
      return null;
    }

    return {
      type: 'modify_keyframe',
      ...(easing ? { easing } : {}),
      keyframeId,
      ...(typeof time === 'number' ? { time } : {}),
      ...(value !== undefined ? { value } : {}),
    };
  }

  if (toolCall.tool === 'delete_keyframe_by_id') {
    const keyframeId = toolCall.args.keyframeId.trim();
    if (keyframeId.length === 0) return null;
    return {
      type: 'delete_keyframe',
      keyframeId,
    };
  }

  if (toolCall.tool === 'delete_item_by_id') {
    const itemId = toolCall.args.id.trim();
    if (itemId.length === 0) return null;
    const nextItems = workingScene.items.filter((item) => item.id !== itemId);
    if (nextItems.length === workingScene.items.length) return null;
    workingScene.items = nextItems;
    if (workingScene.selectedId === itemId) {
      workingScene.selectedId = null;
    }
    return {
      type: 'delete_item',
      target: {
        id: itemId,
      },
    };
  }

  if (toolCall.tool === 'reorder_layers') {
    const ids = toolCall.args.ids.map((id) => id.trim()).filter((id) => id.length > 0);
    const knownIds = new Set(workingScene.items.map((item) => item.id));
    const uniqueKnownIds = ids.filter((id, index) => ids.indexOf(id) === index && knownIds.has(id));
    if (uniqueKnownIds.length === 0) return null;

    const seen = new Set(uniqueKnownIds);
    const remainingIds = workingScene.items
      .map((item) => item.id)
      .filter((id) => !seen.has(id));
    const nextOrder = [...uniqueKnownIds, ...remainingIds];
    workingScene.items = nextOrder
      .map((id) => workingScene.items.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      type: 'reorder_layers',
      ids: nextOrder,
    };
  }

  if (toolCall.tool === 'update_item_by_id') {
    const itemId = toolCall.args.id.trim();
    if (itemId.length === 0) return null;
    const existingItem = workingScene.items.find((item) => item.id === itemId);
    if (!existingItem) return null;

    const props = sanitizeItemPatch(toolCall.args.props);
    const keyframes = sanitizeItemKeyframes(toolCall.args.keyframes ?? []);

    return {
      type: 'update_item',
      target: {
        id: itemId,
      },
      ...(props ? { props } : {}),
      ...(keyframes.length > 0 ? { keyframes } : {}),
    };
  }

  if (toolCall.tool === 'batch_update_items') {
    const updates = toolCall.args.updates.reduce<
      Array<{
        id: string;
        keyframes?: SanitizedItemKeyframe[];
        props?: SanitizedItemPatch;
      }>
    >((accumulator, update) => {
        const id = update.id.trim();
        if (id.length === 0) return accumulator;
        const existingItem = workingScene.items.find((item) => item.id === id);
        if (!existingItem) return accumulator;

        const keyframes = sanitizeItemKeyframes(update.keyframes ?? []);
        const props = sanitizeItemPatch(update.props);
        if (!props && keyframes.length === 0) return accumulator;

        accumulator.push({
          id,
          ...(keyframes.length > 0 ? { keyframes } : {}),
          ...(props ? { props } : {}),
        });
        return accumulator;
      }, []);

    if (updates.length === 0) return null;
    return {
      type: 'batch_update_items',
      updates,
    };
  }

  if (toolCall.tool === 'resolve_overlaps') {
    if (toolCall.args.strategy !== 'opacity_stage') {
      return null;
    }

    const overlapReport = analyzeSceneOverlapsFromScene(
      workingScene,
      toolCall.args.padding ?? 0,
    );
    if (overlapReport.overlapCount === 0) return null;

    const idsToStage = Array.from(
      new Set(
        overlapReport.overlaps.flatMap((overlap) =>
          overlap.likelyNeedsOpacityStaging ? [overlap.a.id, overlap.b.id] : [],
        ),
      ),
    );
    if (idsToStage.length === 0) return null;

    const updates = idsToStage.map((id) => ({
      id,
      keyframes: [
        { easing: 'step', opacity: 0, time: 0 },
        { easing: 'step', opacity: 1, time: 0.2 },
      ],
      props: {
        opacity: 0,
      },
    }));

    return {
      type: 'batch_update_items',
      updates,
    };
  }

  if (toolCall.tool === 'timeline_shift') {
    const ids = toolCall.args.ids.map((id) => id.trim()).filter((id) => id.length > 0);
    const uniqueIds = ids.filter((id, index) => ids.indexOf(id) === index);
    if (uniqueIds.length === 0) return null;
    const deltaSeconds = sanitizeNumber(toolCall.args.deltaSeconds);
    if (typeof deltaSeconds !== 'number') return null;

    return {
      type: 'timeline_shift',
      deltaSeconds,
      ids: uniqueIds,
    };
  }

  if (toolCall.tool === 'duplicate_item') {
    const sourceId = toolCall.args.id.trim();
    if (sourceId.length === 0) return null;
    const sourceItem = workingScene.items.find((item) => item.id === sourceId);
    if (!sourceItem) return null;

    const id = nextGeneratedId();
    const left = sanitizeNumber(toolCall.args.left);
    const top = sanitizeNumber(toolCall.args.top);
    const sourceCurrent = sourceItem.current;
    const duplicateLeft =
      typeof left === 'number'
        ? left
        : typeof sourceCurrent?.left === 'number'
          ? sourceCurrent.left + 32
          : undefined;
    const duplicateTop =
      typeof top === 'number'
        ? top
        : typeof sourceCurrent?.top === 'number'
          ? sourceCurrent.top + 32
          : undefined;

    const keyframes: SanitizedItemKeyframe[] = [];
    const opacityFrames = sourceItem.keyframes?.opacity ?? [];
    if (opacityFrames.length > 0) {
      keyframes.push(
        ...opacityFrames.map((frame) => ({
          opacity: frame.value,
          time: frame.time,
        })),
      );
    }

    if (sourceItem.name === 'text' || sourceItem.text) {
      workingScene.items.unshift({
        id,
        keyframeTimes: [0],
        name: 'text',
        ...(sourceItem.text ? { text: sourceItem.text } : {}),
      });
      workingScene.selectedId = id;
      return {
        type: 'add_text',
        customId: id,
        ...(typeof duplicateLeft === 'number' ? { left: duplicateLeft } : {}),
        ...(typeof duplicateTop === 'number' ? { top: duplicateTop } : {}),
        ...(sourceItem.text ? { text: sourceItem.text } : {}),
        ...(keyframes.length > 0 ? { keyframes } : {}),
      };
    }

    if (sourceItem.name === 'image') {
      return null;
    }

    workingScene.items.unshift({
      id,
      keyframeTimes: [0],
      name: sourceItem.name,
    });
    workingScene.selectedId = id;

    if (sourceItem.name === 'rectangle') {
      return {
        type: 'add_rectangle',
        customId: id,
        ...(typeof sourceCurrent?.fill === 'string' ? { color: sourceCurrent.fill } : {}),
        ...(typeof sourceCurrent?.scaledHeight === 'number'
          ? { height: sourceCurrent.scaledHeight }
          : {}),
        ...(typeof duplicateLeft === 'number' ? { left: duplicateLeft } : {}),
        ...(typeof duplicateTop === 'number' ? { top: duplicateTop } : {}),
        ...(typeof sourceCurrent?.scaledWidth === 'number'
          ? { width: sourceCurrent.scaledWidth }
          : {}),
      };
    }

    if (sourceItem.name === 'line') {
      return {
        type: 'add_line',
        customId: id,
        ...(typeof sourceCurrent?.stroke === 'string' ? { color: sourceCurrent.stroke } : {}),
        ...(typeof sourceCurrent?.scaledHeight === 'number'
          ? { height: sourceCurrent.scaledHeight }
          : {}),
        ...(typeof duplicateLeft === 'number' ? { left: duplicateLeft } : {}),
        ...(typeof duplicateTop === 'number' ? { top: duplicateTop } : {}),
        ...(typeof sourceCurrent?.scaledWidth === 'number'
          ? { width: sourceCurrent.scaledWidth }
          : {}),
      };
    }

    if (sourceItem.name === 'polygon') {
      return {
        type: 'add_polygon',
        customId: id,
        ...(typeof sourceCurrent?.fill === 'string' ? { color: sourceCurrent.fill } : {}),
        ...(typeof sourceCurrent?.scaledHeight === 'number'
          ? { height: sourceCurrent.scaledHeight }
          : {}),
        ...(typeof duplicateLeft === 'number' ? { left: duplicateLeft } : {}),
        ...(typeof duplicateTop === 'number' ? { top: duplicateTop } : {}),
        ...(typeof sourceCurrent?.scaledWidth === 'number'
          ? { width: sourceCurrent.scaledWidth }
          : {}),
      };
    }

    if (sourceItem.name === 'circle') {
      return {
        type: 'add_circle',
        customId: id,
        ...(typeof sourceCurrent?.fill === 'string' ? { color: sourceCurrent.fill } : {}),
        ...(typeof duplicateLeft === 'number' ? { left: duplicateLeft } : {}),
        ...(typeof sourceCurrent?.scaledWidth === 'number'
          ? { radius: Math.max(1, sourceCurrent.scaledWidth / 2) }
          : {}),
        ...(typeof duplicateTop === 'number' ? { top: duplicateTop } : {}),
      };
    }

    return null;
  }

  if (toolCall.tool === 'add_image') {
    const id = nextGeneratedId();
    const height = sanitizeNumber(toolCall.args.height);
    const left = sanitizeNumber(toolCall.args.left);
    const prompt = sanitizeText(toolCall.args.prompt);
    const right = sanitizeNumber(toolCall.args.right);
    const top = sanitizeNumber(toolCall.args.top);
    const url = sanitizeText(toolCall.args.url);
    const width = sanitizeNumber(toolCall.args.width);

    if (!prompt && !url) return null;

    const command: ToolBackedCommand = {
      type: 'add_image',
      customId: id,
      ...(typeof height === 'number' ? { height } : {}),
      ...(typeof left === 'number' ? { left } : {}),
      ...(prompt ? { prompt } : {}),
      ...(typeof right === 'number' ? { right } : {}),
      ...(typeof top === 'number' ? { top } : {}),
      ...(url ? { url } : {}),
      ...(typeof width === 'number' ? { width } : {}),
    };

    workingScene.items.unshift({
      id,
      keyframeTimes: [0],
      name: 'image',
    });
    workingScene.selectedId = id;
    return command;
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

    workingScene.items.unshift({
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

    workingScene.items.unshift({
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

    workingScene.items.unshift({
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

    workingScene.items.unshift({
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

  workingScene.items.unshift({
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

type SanitizedItemPatch = {
  angle?: number;
  fill?: string;
  left?: number;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  text?: string;
  top?: number;
  width?: number;
};

type SanitizedItemKeyframe = {
  angle?: number;
  easing?: 'linear' | 'step' | 'easeIn' | 'easeOut' | 'easeInOut' | 'elastic' | 'bounce';
  fill?: string;
  left?: number;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  time: number;
  top?: number;
};

/** Converts optional item patch payload into sanitized command props. */
function sanitizeItemPatch(
  props: {
    angle?: number | null;
    fill?: string | null;
    left?: number | null;
    opacity?: number | null;
    scaleX?: number | null;
    scaleY?: number | null;
    stroke?: string | null;
    text?: string | null;
    top?: number | null;
    width?: number | null;
  } | null,
): SanitizedItemPatch | undefined {
  if (!props) return undefined;
  const nextProps = {
    ...(typeof sanitizeNumber(props.angle) === 'number'
      ? { angle: sanitizeNumber(props.angle) }
      : {}),
    ...(sanitizeColor(props.fill) ? { fill: sanitizeColor(props.fill) } : {}),
    ...(typeof sanitizeNumber(props.left) === 'number'
      ? { left: sanitizeNumber(props.left) }
      : {}),
    ...(typeof sanitizeNumber(props.opacity) === 'number'
      ? { opacity: sanitizeNumber(props.opacity) }
      : {}),
    ...(typeof sanitizeNumber(props.scaleX) === 'number'
      ? { scaleX: sanitizeNumber(props.scaleX) }
      : {}),
    ...(typeof sanitizeNumber(props.scaleY) === 'number'
      ? { scaleY: sanitizeNumber(props.scaleY) }
      : {}),
    ...(sanitizeColor(props.stroke) ? { stroke: sanitizeColor(props.stroke) } : {}),
    ...(sanitizeText(props.text) ? { text: sanitizeText(props.text) } : {}),
    ...(typeof sanitizeNumber(props.top) === 'number'
      ? { top: sanitizeNumber(props.top) }
      : {}),
    ...(typeof sanitizeNumber(props.width) === 'number'
      ? { width: sanitizeNumber(props.width) }
      : {}),
  };
  return Object.keys(nextProps).length > 0 ? nextProps : undefined;
}

/** Converts optional keyframe payloads into sanitized keyframe command entries. */
function sanitizeItemKeyframes(
  keyframes: Array<{
    angle?: number | null;
    easing?:
      | 'linear'
      | 'step'
      | 'easeIn'
      | 'easeOut'
      | 'easeInOut'
      | 'elastic'
      | 'bounce'
      | null;
    fill?: string | null;
    left?: number | null;
    opacity?: number | null;
    scaleX?: number | null;
    scaleY?: number | null;
    stroke?: string | null;
    time?: number | null;
    top?: number | null;
  }>,
): SanitizedItemKeyframe[] {
  return keyframes
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
}
