import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type {
  AIEditorCommand,
  AIItemKeyframe,
  AIItemPatch,
  AIItemTarget,
} from './editor-ai-events';

type OpenAIChatResult = {
  reply: string;
  commands: AIEditorCommand[];
  responseId: string | null;
};

export type OpenAISceneContext = {
  selectedId: string | null;
  project?: {
    canvasWidth: number;
    canvasHeight: number;
    videoWidth: number;
    videoHeight: number;
    videoLeft: number;
    videoTop: number;
    videoRight: number;
    videoBottom: number;
    videoAspectRatio: number;
    videoAspectLabel: string;
  };
  items: Array<{
    id: string;
    name: string;
    keyframeTimes: number[];
    current?: {
      left: number;
      top: number;
      scaleX: number;
      scaleY: number;
      opacity: number;
      angle: number;
      fill?: string;
      stroke?: string;
    };
    keyframes?: {
      left?: Array<{ id: string; time: number; value: number }>;
      top?: Array<{ id: string; time: number; value: number }>;
      scaleX?: Array<{ id: string; time: number; value: number }>;
      scaleY?: Array<{ id: string; time: number; value: number }>;
      opacity?: Array<{ id: string; time: number; value: number }>;
      angle?: Array<{ id: string; time: number; value: number }>;
      fill?: Array<{ id: string; time: number; value: string }>;
      stroke?: Array<{ id: string; time: number; value: string }>;
    };
  }>;
};

type SceneItem = OpenAISceneContext['items'][number];
type ProjectContextPayload = NonNullable<OpenAISceneContext['project']>;

type ToolExecutionState = {
  hasAddedItem: boolean;
};

type AgentStepLog = {
  step: number;
  result: string;
};

const MAX_AGENT_STEPS = 10;

const AGENT_SYSTEM_PROMPT =
  'You are a motion editor agent. Follow this fixed loop: ' +
  '1) read project context, 2) decide exactly one action, 3) execute, ' +
  '4) re-read context, 5) repeat until done or user input is needed. ' +
  'You must output exactly one decision each step. Never output multiple ' +
  'actions in one step. Prefer target.id from context for updates/deletes. ' +
  'Respect video boundaries whenever possible. For text creation choose ' +
  'accessible dark colors on light backgrounds. For images: if user gave no ' +
  'URL, use prompt generation; generated images must be PNG and <=2MB. ' +
  'When finished, use status=done with a concise markdown summary. If ' +
  'blocked by missing details, use status=needs_user_input and ask one clear question.';

const aiItemKeyframeSchema = z.object({
  time: z.number(),
  left: z.number().nullable(),
  top: z.number().nullable(),
  scaleX: z.number().nullable(),
  scaleY: z.number().nullable(),
  opacity: z.number().nullable(),
  angle: z.number().nullable(),
}).strict();

const aiItemTargetSchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
  })
  .strict();

const updatePropsSchema = z
  .object({
    left: z.number().nullable(),
    top: z.number().nullable(),
    scaleX: z.number().nullable(),
    scaleY: z.number().nullable(),
    opacity: z.number().nullable(),
    angle: z.number().nullable(),
    text: z.string().nullable(),
  })
  .strict();

const commandSchema = z
  .object({
    type: z.enum([
      'add_circle',
      'add_polygon',
      'add_line',
      'add_rectangle',
      'add_text',
      'add_image',
      'update_item',
      'delete_item',
    ]),
    color: z.string().nullable(),
    text: z.string().nullable(),
    url: z.string().nullable(),
    prompt: z.string().nullable(),
    target: aiItemTargetSchema,
    props: updatePropsSchema,
    keyframes: z.array(aiItemKeyframeSchema).nullable(),
  })
  .strict();

const decisionSchema = z
  .object({
    status: z.enum(['action', 'done', 'needs_user_input']),
    message: z.string().min(1),
    action: commandSchema.nullable(),
  })
  .strict();

function cloneSceneContext(sceneContext: OpenAISceneContext): OpenAISceneContext {
  return JSON.parse(JSON.stringify(sceneContext)) as OpenAISceneContext;
}

function sanitizeKeyframes(keyframes: unknown): AIItemKeyframe[] {
  if (!Array.isArray(keyframes)) return [];
  return keyframes
    .map((value) => {
      if (!value || typeof value !== 'object') return null;
      const candidate = value as Partial<AIItemKeyframe>;
      const next: AIItemKeyframe = {
        time:
          typeof candidate.time === 'number' && Number.isFinite(candidate.time)
            ? candidate.time
            : Number.NaN,
      };

      if (typeof candidate.left === 'number' && Number.isFinite(candidate.left)) {
        next.left = candidate.left;
      }
      if (typeof candidate.top === 'number' && Number.isFinite(candidate.top)) {
        next.top = candidate.top;
      }
      if (
        typeof candidate.scaleX === 'number' &&
        Number.isFinite(candidate.scaleX)
      ) {
        next.scaleX = candidate.scaleX;
      }
      if (
        typeof candidate.scaleY === 'number' &&
        Number.isFinite(candidate.scaleY)
      ) {
        next.scaleY = candidate.scaleY;
      }
      if (
        typeof candidate.opacity === 'number' &&
        Number.isFinite(candidate.opacity)
      ) {
        next.opacity = candidate.opacity;
      }
      if (typeof candidate.angle === 'number' && Number.isFinite(candidate.angle)) {
        next.angle = candidate.angle;
      }

      return Number.isFinite(next.time) ? next : null;
    })
    .filter((value): value is AIItemKeyframe => value !== null);
}

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseHexColor(color: string) {
  const value = color.trim().replace(/^#/, '');
  if (![3, 6].includes(value.length) || !/^[0-9a-f]+$/i.test(value)) {
    return null;
  }
  const full =
    value.length === 3
      ? `${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`
      : value;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function parseRgbColor(color: string) {
  const match = color
    .trim()
    .match(
      /^rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)(?:[,\s/]+[0-9.]+)?\s*\)$/i,
    );
  if (!match) return null;

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  if (![r, g, b].every(Number.isFinite)) return null;

  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }) {
  const transform = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * transform(rgb.r) +
    0.7152 * transform(rgb.g) +
    0.0722 * transform(rgb.b)
  );
}

function sanitizeAccessibleTextColor(color: string | undefined) {
  const fallback = '#0f172a';
  if (!color) return fallback;

  const parsed = parseHexColor(color) ?? parseRgbColor(color);
  if (!parsed) return fallback;

  return relativeLuminance(parsed) > 0.45 ? fallback : color;
}

function sanitizeTarget(value: unknown): AIItemTarget | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { id?: unknown; name?: unknown };
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';

  if (!id && !name) return null;

  return {
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
  };
}

function sanitizeProps(value: unknown): AIItemPatch | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<AIItemPatch>;
  const next: AIItemPatch = {};

  if (typeof candidate.left === 'number' && Number.isFinite(candidate.left)) {
    next.left = candidate.left;
  }
  if (typeof candidate.top === 'number' && Number.isFinite(candidate.top)) {
    next.top = candidate.top;
  }
  if (typeof candidate.scaleX === 'number' && Number.isFinite(candidate.scaleX)) {
    next.scaleX = candidate.scaleX;
  }
  if (typeof candidate.scaleY === 'number' && Number.isFinite(candidate.scaleY)) {
    next.scaleY = candidate.scaleY;
  }
  if (typeof candidate.opacity === 'number' && Number.isFinite(candidate.opacity)) {
    next.opacity = candidate.opacity;
  }
  if (typeof candidate.angle === 'number' && Number.isFinite(candidate.angle)) {
    next.angle = candidate.angle;
  }
  if (typeof candidate.text === 'string' && candidate.text.trim().length > 0) {
    next.text = candidate.text.trim();
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function resolveItemIndex(
  sceneContext: OpenAISceneContext,
  target?: AIItemTarget | null,
): number {
  if (!target) return -1;

  if (target.id) {
    return sceneContext.items.findIndex((item) => item.id === target.id);
  }

  if (!target.name) return -1;
  const needle = target.name.trim().toLowerCase();

  const exact = sceneContext.items.findIndex(
    (item) => item.name.trim().toLowerCase() === needle,
  );
  if (exact >= 0) return exact;

  return sceneContext.items.findIndex((item) =>
    item.name.trim().toLowerCase().includes(needle),
  );
}

function getProjectContextPayload(
  sceneContext: OpenAISceneContext,
): ProjectContextPayload {
  return (
    sceneContext.project ?? {
      canvasWidth: 0,
      canvasHeight: 0,
      videoWidth: 0,
      videoHeight: 0,
      videoLeft: 0,
      videoTop: 0,
      videoRight: 0,
      videoBottom: 0,
      videoAspectRatio: 16 / 9,
      videoAspectLabel: '16:9',
    }
  );
}

function getOpenAIResponseId(providerMetadata: unknown): string | null {
  if (!providerMetadata || typeof providerMetadata !== 'object') {
    return null;
  }

  const openaiValue = (providerMetadata as Record<string, unknown>).openai;
  if (!openaiValue || typeof openaiValue !== 'object') {
    return null;
  }

  const responseId = (openaiValue as Record<string, unknown>).responseId;
  return typeof responseId === 'string' && responseId.trim().length > 0
    ? responseId
    : null;
}

function applyCommandToWorkingScene(
  sceneContext: OpenAISceneContext,
  command: AIEditorCommand,
  nextGeneratedId: () => string,
): void {
  if (
    command.type === 'add_circle' ||
    command.type === 'add_polygon' ||
    command.type === 'add_line' ||
    command.type === 'add_rectangle' ||
    command.type === 'add_text' ||
    command.type === 'add_image'
  ) {
    const id = nextGeneratedId();
    const nameByType: Record<string, string> = {
      add_circle: 'circle',
      add_polygon: 'polygon',
      add_line: 'line',
      add_rectangle: 'rectangle',
      add_text: 'text',
      add_image: 'image',
    };

    const keyframeTimes =
      command.keyframes?.map((keyframe) => keyframe.time).filter(Number.isFinite) ??
      [0];

    const item: SceneItem = {
      id,
      name: nameByType[command.type] ?? 'item',
      keyframeTimes,
      current: {
        left: 0,
        top: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        angle: 0,
      },
      keyframes: {},
    };

    sceneContext.items.push(item);
    sceneContext.selectedId = id;
    return;
  }

  if (command.type === 'delete_item') {
    const index = resolveItemIndex(sceneContext, command.target);
    if (index < 0) return;
    const [removed] = sceneContext.items.splice(index, 1);
    if (sceneContext.selectedId === removed.id) {
      sceneContext.selectedId = null;
    }
    return;
  }

  if (command.type === 'update_item') {
    const index = resolveItemIndex(sceneContext, command.target);
    if (index < 0) return;
    const item = sceneContext.items[index];

    item.current ??= {
      left: 0,
      top: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      angle: 0,
    };

    if (command.props) {
      if (typeof command.props.left === 'number') item.current.left = command.props.left;
      if (typeof command.props.top === 'number') item.current.top = command.props.top;
      if (typeof command.props.scaleX === 'number') item.current.scaleX = command.props.scaleX;
      if (typeof command.props.scaleY === 'number') item.current.scaleY = command.props.scaleY;
      if (typeof command.props.opacity === 'number') item.current.opacity = command.props.opacity;
      if (typeof command.props.angle === 'number') item.current.angle = command.props.angle;
    }

    const newTimes = (command.keyframes ?? []).map((keyframe) => keyframe.time);
    const mergedTimes = Array.from(
      new Set([...item.keyframeTimes, ...newTimes]),
    ).sort((a, b) => a - b);

    item.keyframeTimes = mergedTimes;
    sceneContext.selectedId = item.id;
  }
}

function isAddCommand(command: AIEditorCommand): boolean {
  return (
    command.type === 'add_circle' ||
    command.type === 'add_polygon' ||
    command.type === 'add_line' ||
    command.type === 'add_rectangle' ||
    command.type === 'add_text' ||
    command.type === 'add_image'
  );
}

function sanitizeCommand(command: z.infer<typeof commandSchema>): AIEditorCommand | null {
  if (command.type === 'add_circle') {
    return {
      type: 'add_circle',
      color: sanitizeColor(command.color),
      keyframes: sanitizeKeyframes(command.keyframes),
    };
  }

  if (command.type === 'add_polygon') {
    return {
      type: 'add_polygon',
      color: sanitizeColor(command.color),
      keyframes: sanitizeKeyframes(command.keyframes),
    };
  }

  if (command.type === 'add_line') {
    return {
      type: 'add_line',
      color: sanitizeColor(command.color),
      keyframes: sanitizeKeyframes(command.keyframes),
    };
  }

  if (command.type === 'add_rectangle') {
    return {
      type: 'add_rectangle',
      color: sanitizeColor(command.color),
      keyframes: sanitizeKeyframes(command.keyframes),
    };
  }

  if (command.type === 'add_text') {
    return {
      type: 'add_text',
      text: (command.text ?? '').trim() || 'AI text',
      color: sanitizeAccessibleTextColor(sanitizeColor(command.color)),
      keyframes: sanitizeKeyframes(command.keyframes),
    };
  }

  if (command.type === 'add_image') {
    const url = typeof command.url === 'string' ? command.url.trim() : '';
    const prompt = typeof command.prompt === 'string' ? command.prompt.trim() : '';

    if (!url && !prompt) return null;

    return {
      type: 'add_image',
      ...(url ? { url } : {}),
      ...(prompt ? { prompt } : {}),
      keyframes: sanitizeKeyframes(command.keyframes),
    };
  }

  if (command.type === 'update_item') {
    const target = sanitizeTarget(command.target);
    if (!target) return null;

    const props = sanitizeProps(command.props);
    const keyframes = sanitizeKeyframes(command.keyframes);

    return {
      type: 'update_item',
      target,
      ...(props ? { props } : {}),
      ...(keyframes.length > 0 ? { keyframes } : {}),
    };
  }

  if (command.type === 'delete_item') {
    const target = sanitizeTarget(command.target);
    if (!target) return null;

    return {
      type: 'delete_item',
      target,
    };
  }

  return null;
}

function buildAgentPrompt(
  userPrompt: string,
  workingScene: OpenAISceneContext,
  step: number,
  logs: AgentStepLog[],
): string {
  const project = getProjectContextPayload(workingScene);
  const previousSteps = logs.length
    ? logs.map((entry) => `- Step ${entry.step}: ${entry.result}`).join('\n')
    : '- none';

  return [
    `User request:\n${userPrompt}`,
    `Current step: ${step}/${MAX_AGENT_STEPS}`,
    'Project context JSON:',
    '```json',
    JSON.stringify(
      {
        selectedId: workingScene.selectedId,
        project,
        videoBoundary: {
          left: project.videoLeft,
          top: project.videoTop,
          right: project.videoRight,
          bottom: project.videoBottom,
          width: project.videoWidth,
          height: project.videoHeight,
        },
        outsideVideoAreaRule:
          'x < videoLeft || x > videoRight || y < videoTop || y > videoBottom',
        items: workingScene.items,
      },
      null,
      2,
    ),
    '```',
    'Execution log so far:',
    previousSteps,
    'Decide next step using decision schema.',
    'If an action is needed, return exactly one action.',
    'If complete, return status="done".',
    'If blocked, return status="needs_user_input" with one question.',
  ].join('\n\n');
}

export async function generateOpenAIChatTurn(
  prompt: string,
  sceneContext: OpenAISceneContext,
  previousResponseId?: string | null,
  onStep?: (message: string) => void,
): Promise<OpenAIChatResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY in environment.');
  }

  const baseUrl =
    import.meta.env.VITE_OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const model = import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-5';
  const isGpt5Model = model.toLowerCase().startsWith('gpt-5');

  const openai = createOpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  const workingScene = cloneSceneContext(sceneContext);
  const commands: AIEditorCommand[] = [];
  const logs: AgentStepLog[] = [];
  const executionState: ToolExecutionState = {
    hasAddedItem: false,
  };

  let generatedItemCounter = 0;
  const nextGeneratedId = () => {
    generatedItemCounter += 1;
    return `ai-item-${generatedItemCounter}`;
  };

  let responseId: string | null = previousResponseId ?? null;

  for (let step = 1; step <= MAX_AGENT_STEPS; step += 1) {
    onStep?.(`Step ${step}: reading context and deciding next action...`);
    const openaiOptions: {
      previousResponseId?: string;
      reasoningEffort?: 'minimal';
      textVerbosity?: 'medium';
      systemMessageMode?: 'developer';
    } = {};

    if (responseId) {
      openaiOptions.previousResponseId = responseId;
    }
    if (isGpt5Model) {
      openaiOptions.reasoningEffort = 'minimal';
      openaiOptions.textVerbosity = 'medium';
      openaiOptions.systemMessageMode = 'developer';
    }

    const result = await generateObject({
      model: openai(model),
      system: AGENT_SYSTEM_PROMPT,
      schema: decisionSchema,
      prompt: buildAgentPrompt(prompt, workingScene, step, logs),
      ...(Object.keys(openaiOptions).length > 0
        ? { providerOptions: { openai: openaiOptions } }
        : {}),
    });

    responseId = getOpenAIResponseId(result.providerMetadata) ?? responseId;
    const decision = result.object;

    if (decision.status === 'done') {
      onStep?.(`Step ${step}: done.`);
      return {
        reply: decision.message,
        commands,
        responseId,
      };
    }

    if (decision.status === 'needs_user_input') {
      onStep?.(`Step ${step}: waiting for user input.`);
      return {
        reply: decision.message,
        commands,
        responseId,
      };
    }

    if (!decision.action) {
      onStep?.(`Step ${step}: no action returned.`);
      logs.push({
        step,
        result: 'No action payload returned by model.',
      });
      continue;
    }

    const command = sanitizeCommand(decision.action);
    if (!command) {
      onStep?.(`Step ${step}: invalid action payload.`);
      logs.push({
        step,
        result: 'Invalid action payload.',
      });
      continue;
    }

    if (isAddCommand(command) && executionState.hasAddedItem) {
      onStep?.(`Step ${step}: blocked by one-add-item-per-run rule.`);
      logs.push({
        step,
        result: 'Blocked: one add-item action is allowed per run.',
      });
      continue;
    }

    if (isAddCommand(command)) {
      executionState.hasAddedItem = true;
    }

    applyCommandToWorkingScene(workingScene, command, nextGeneratedId);
    commands.push(command);
    onStep?.(`Step ${step}: executed ${command.type}.`);

    logs.push({
      step,
      result: `Executed action: ${command.type}`,
    });
  }

  return {
    reply:
      commands.length > 0
        ? `Reached step limit (${MAX_AGENT_STEPS}). Executed ${commands.length} action${commands.length === 1 ? '' : 's'}.`
        : `Reached step limit (${MAX_AGENT_STEPS}) without executable action.`,
    commands,
    responseId,
  };
}

export async function generateOpenAIImageDataUrl(
  prompt: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY in environment.');
  }

  const baseUrl =
    import.meta.env.VITE_OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI image generation failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  const first = data.data?.[0];
  if (!first) {
    throw new Error('OpenAI image generation returned no data.');
  }

  if (first.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  if (first.url) return first.url;

  throw new Error('OpenAI image generation payload missing image output.');
}
