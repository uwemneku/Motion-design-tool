/** Openai Chat.Ts module implementation. */
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import {
  emitAIEditorCommand,
  emitAIStepComplete,
  type AIEditorCommand,
} from "./editor-ai-events";
import {
  analyzeSceneOverlapsFromScene,
  applyToolCallToWorkingScene,
  AVAILABLE_TOOLS_PROMPT_TEXT,
  createTextLayoutFromScene,
  findTextSlotFromScene,
  getItemGeometryFromScene,
  getItemsInVideoAreaFromScene,
  getLayerOrderFromScene,
  toolCallSchema,
} from "./tools";
import {
  AGENT_STEP_INSTRUCTION_PROMPT,
  AGENT_SYSTEM_PROMPT,
  AGENT_TARGET_STEPS,
  MAX_AGENT_STEPS,
} from "../../../const";

type OpenAIChatResult = {
  commands: AIEditorCommand[];
  reply: string;
  responseId: string | null;
};

export type OpenAISceneContext = {
  selectedId: string | null;
  project?: {
    canvasHeight: number;
    canvasWidth: number;
    durationSeconds: number;
    videoAspectLabel: string;
    videoAspectRatio: number;
    videoBottom: number;
    videoHeight: number;
    videoLeft: number;
    videoRight: number;
    videoTop: number;
    videoWidth: number;
  };
  items: Array<{
    current?: {
      angle: number;
      bounds?: {
        bottom: number;
        left: number;
        right: number;
        top: number;
      };
      centerX: number;
      centerY: number;
      fill?: string;
      fontFamily?: string;
      fontSize?: number;
      height?: number;
      left: number;
      opacity: number;
      scaleX: number;
      scaleY: number;
      scaledHeight?: number;
      scaledWidth?: number;
      stroke?: string;
      text?: string;
      top: number;
      width?: number;
    };
    id: string;
    keyframes?: {
      angle?: Array<{ id: string; time: number; value: number }>;
      fill?: Array<{ id: string; time: number; value: string }>;
      left?: Array<{ id: string; time: number; value: number }>;
      opacity?: Array<{ id: string; time: number; value: number }>;
      scaleX?: Array<{ id: string; time: number; value: number }>;
      scaleY?: Array<{ id: string; time: number; value: number }>;
      stroke?: Array<{ id: string; time: number; value: string }>;
      top?: Array<{ id: string; time: number; value: number }>;
    };
    keyframeTimes: number[];
    name: string;
    text?: string;
  }>;
};

type AgentStepLog = {
  result: string;
  step: number;
};

type ToolResultLog = {
  duplicateSignature?: string;
  createdId?: string;
  data?: unknown;
  status: "executed" | "skipped";
  step: number;
  tool: string;
};

const stepDecisionSchema = z
  .object({
    message: z.string().min(1),
    status: z.enum(["tool_call", "done", "needs_user_input"]),
    toolCalls: z.array(toolCallSchema),
  })
  .strict();
type StepDecision = z.infer<typeof stepDecisionSchema>;

/** Deep clones scene context for local planning/execution simulation. */
function cloneSceneContext(
  sceneContext: OpenAISceneContext,
): OpenAISceneContext {
  return JSON.parse(JSON.stringify(sceneContext)) as OpenAISceneContext;
}

/** Reads OpenAI response id from provider metadata for conversation continuity. */
function getOpenAIResponseId(providerMetadata: unknown): string | null {
  if (!providerMetadata || typeof providerMetadata !== "object") {
    return null;
  }

  const openaiValue = (providerMetadata as Record<string, unknown>).openai;
  if (!openaiValue || typeof openaiValue !== "object") {
    return null;
  }

  const responseId = (openaiValue as Record<string, unknown>).responseId;
  return typeof responseId === "string" && responseId.trim().length > 0
    ? responseId
    : null;
}

/** Builds a compact prompt for one loop step with current context and logs. */
function buildLoopStepPrompt(
  userPrompt: string,
  scenePayload: ScenePromptPayload,
  step: number,
  latestStepLog: AgentStepLog | null,
  latestStepToolResults: ToolResultLog[],
  includeTools: boolean,
) {
  const latestStepSummary = latestStepLog
    ? `- Step ${latestStepLog.step}: ${latestStepLog.result}`
    : "- none";
  const latestToolResultsText =
    latestStepToolResults.length > 0
      ? latestStepToolResults
          .map((entry) =>
            JSON.stringify({
              commandType: entry.data ? undefined : entry.tool,
              duplicateSignature: entry.duplicateSignature,
              createdId: entry.createdId,
              data: compactJsonValue(entry.data),
              status: entry.status,
              step: entry.step,
              tool: entry.tool,
            }),
          )
          .join("\n")
      : "- none";
  const project = scenePayload.project;
  const videoAnchors = project
    ? {
        center: {
          x: project.videoLeft + project.videoWidth / 2,
          y: project.videoTop + project.videoHeight / 2,
        },
        thirds: {
          x1: project.videoLeft + project.videoWidth / 3,
          x2: project.videoLeft + (project.videoWidth * 2) / 3,
          y1: project.videoTop + project.videoHeight / 3,
          y2: project.videoTop + (project.videoHeight * 2) / 3,
        },
        paddedBounds: {
          left: project.videoLeft + 24,
          top: project.videoTop + 24,
          right: project.videoRight - 24,
          bottom: project.videoBottom - 24,
        },
      }
    : null;

  return [
    `User objective:\n${userPrompt}`,
    `Current step: ${step}/${MAX_AGENT_STEPS}`,
    `Target completion: <= ${AGENT_TARGET_STEPS} steps when possible.`,
    AGENT_STEP_INSTRUCTION_PROMPT,
    "Layer order convention: reorder_layers expects top-to-bottom IDs.",
    ...(includeTools ? [`Available tool(s): ${AVAILABLE_TOOLS_PROMPT_TEXT}`] : []),
    "Scene context JSON:",
    "```json",
    JSON.stringify(scenePayload),
    "```",
    "Video area reference points JSON:",
    "```json",
    JSON.stringify(videoAnchors),
    "```",
    "Latest step summary (incremental; earlier steps are in conversation context):",
    latestStepSummary,
    "Latest tool results (JSON lines; incremental):",
    latestToolResultsText,
  ].join("\n\n");
}

/** Produces a compact scene payload to reduce per-step token cost. */
function buildCompactSceneContext(scene: OpenAISceneContext) {
  const compact = compactJsonValue(scene) as Partial<OpenAISceneContext> | undefined;
  return {
    items: Array.isArray(compact?.items) ? compact.items : [],
    selectedId: compact?.selectedId ?? null,
    ...(compact?.project ? { project: compact.project } : {}),
  };
}

type ScenePromptPayload = {
  changedItems?: OpenAISceneContext["items"];
  items?: OpenAISceneContext["items"];
  project?: OpenAISceneContext["project"];
  removedItemIds?: string[];
  selectedId: string | null;
  stepMode: "delta" | "full";
};

/** Creates full payload on step 1 and deltas for following steps. */
function buildScenePromptPayload(
  compactScene: OpenAISceneContext,
  previousScene: OpenAISceneContext | null,
): ScenePromptPayload {
  if (!previousScene) {
    return {
      items: compactScene.items,
      project: compactScene.project,
      selectedId: compactScene.selectedId,
      stepMode: "full",
    };
  }

  const previousById = new Map(previousScene.items.map((item) => [item.id, item]));
  const currentIds = new Set(compactScene.items.map((item) => item.id));
  const changedItems = compactScene.items.filter((item) => {
    const previousItem = previousById.get(item.id);
    if (!previousItem) return true;
    return stableStringify(item) !== stableStringify(previousItem);
  });
  const removedItemIds = previousScene.items
    .map((item) => item.id)
    .filter((id) => !currentIds.has(id));

  return {
    ...(changedItems.length > 0 ? { changedItems } : {}),
    ...(removedItemIds.length > 0 ? { removedItemIds } : {}),
    project: compactScene.project,
    selectedId: compactScene.selectedId,
    stepMode: "delta",
  };
}

/** Serializes objects with stable key ordering for deterministic diff checks. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

/** Recursively sorts object keys to make structural comparisons stable. */
function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeys(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return Object.fromEntries(
    entries.map(([key, nested]) => [key, sortObjectKeys(nested)]),
  );
}

/** Removes nullish/empty fields and rounds numbers for prompt efficiency. */
function compactJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => compactJsonValue(entry))
      .filter((entry) => entry !== undefined);
    return next.length > 0 ? next : undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : undefined;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => [key, compactJsonValue(nested)] as const)
      .filter(([, nested]) => nested !== undefined);
    if (entries.length === 0) {
      return undefined;
    }
    return Object.fromEntries(entries);
  }

  if (value === null) {
    return undefined;
  }

  return value;
}

/** Extracts top-level JSON object substrings from potentially concatenated text. */
function extractTopLevelJsonObjects(text: string) {
  const results: string[] = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
      continue;
    }

    if (character === "}") {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        results.push(text.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return results;
}

/** Attempts to recover a valid step decision from malformed/multi-object model output. */
function recoverStepDecisionFromError(error: unknown): StepDecision | null {
  if (!error || typeof error !== "object") return null;
  const maybeText = (error as Record<string, unknown>).text;
  if (typeof maybeText !== "string" || maybeText.trim().length === 0) {
    return null;
  }

  const parsedCandidates: StepDecision[] = [];
  const jsonObjects = extractTopLevelJsonObjects(maybeText);
  for (const jsonText of jsonObjects) {
    try {
      const candidate = JSON.parse(jsonText) as unknown;
      const validated = stepDecisionSchema.safeParse(candidate);
      if (validated.success) {
        parsedCandidates.push(validated.data);
      }
    } catch {
      // Ignore malformed candidates and continue scanning.
    }
  }

  if (parsedCandidates.length === 0) return null;
  const toolCallCandidate = parsedCandidates.find(
    (candidate) =>
      candidate.status === "tool_call" && candidate.toolCalls.length > 0,
  );
  return toolCallCandidate ?? parsedCandidates[0];
}

/**
 * Runs an iterative AI tool loop until done/blocked/step-limit.
 * Tools are frontend-executable commands returned in `commands`.
 */
export async function generateOpenAIChatTurn(
  prompt: string,
  sceneContext: OpenAISceneContext,
  previousResponseId?: string | null,
  onStep?: (message: string) => void,
  refreshSceneContext?: () => OpenAISceneContext | Promise<OpenAISceneContext>,
): Promise<OpenAIChatResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_OPENAI_API_KEY in environment.");
  }

  const baseUrl =
    import.meta.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = import.meta.env.VITE_OPENAI_MODEL ?? "gpt-5";

  const openai = createOpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  let workingScene = cloneSceneContext(sceneContext);
  const commands: AIEditorCommand[] = [];
  const createdItemIds: string[] = [];
  let executedCommandCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let latestStepLog: AgentStepLog | null = null;
  let latestStepToolResults: ToolResultLog[] = [];
  let previousCompactScene: OpenAISceneContext | null = null;
  const executedToolCallSignatures = new Set<string>();

  const nextGeneratedId = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return `ai-item-${crypto.randomUUID()}`;
    }
    return `ai-item-${Math.random().toString(36).slice(2, 10)}`;
  };

  let responseId: string | null = previousResponseId ?? null;
  let shouldSendSystemPrompt = !responseId;

  for (let step = 1; step <= MAX_AGENT_STEPS; step += 1) {
    onStep?.(`Step ${step}: deciding tool calls...`);
    const compactScene = buildCompactSceneContext(workingScene);
    const scenePayload = buildScenePromptPayload(compactScene, previousCompactScene);

    let result:
      | {
          object: StepDecision;
          providerMetadata?: unknown;
          usage?: unknown;
        }
      | null = null;
    let decision: StepDecision;
    try {
      result = await generateObject({
        model: openai(model),
        ...(shouldSendSystemPrompt
          ? {
              system: AGENT_SYSTEM_PROMPT,
            }
          : {}),
        schema: stepDecisionSchema,
        prompt: buildLoopStepPrompt(
          prompt,
          scenePayload,
          step,
          latestStepLog,
          latestStepToolResults,
          step === 1,
        ),
        ...(responseId
          ? {
              providerOptions: {
                openai: {
                  previousResponseId: responseId,
                  reasoningEffort: "minimal",
                  systemMessageMode: "developer",
                  textVerbosity: "low",
                },
              },
            }
          : {
              providerOptions: {
                openai: {
                  reasoningEffort: "minimal",
                  systemMessageMode: "developer",
                  textVerbosity: "low",
                },
              },
            }),
      });
      decision = result.object;
      const usage = getUsage(result);
      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;
    } catch (error) {
      const recoveredDecision = recoverStepDecisionFromError(error);
      if (!recoveredDecision) {
        throw error;
      }
      decision = recoveredDecision;
    }
    shouldSendSystemPrompt = false;
    previousCompactScene = compactScene;

    responseId =
      (result ? getOpenAIResponseId(result.providerMetadata) : null) ?? responseId;

    if (decision.status === "done") {
      onStep?.(`Step ${step}: objective complete.`);
      const idFeedback =
        createdItemIds.length > 0
          ? `\n\nCreated item IDs: ${createdItemIds.join(", ")}`
          : "";
      const tokenFeedback =
        `\n\nToken usage (in/out): ${totalInputTokens}/${totalOutputTokens}.`;
      return {
        commands,
        reply: `${decision.message}${idFeedback}${tokenFeedback}`,
        responseId,
      };
    }

    if (decision.status === "needs_user_input") {
      onStep?.(`Step ${step}: waiting for user input.`);
      const idFeedback =
        createdItemIds.length > 0
          ? `\n\nCreated item IDs: ${createdItemIds.join(", ")}`
          : "";
      const tokenFeedback =
        `\n\nToken usage (in/out): ${totalInputTokens}/${totalOutputTokens}.`;
      return {
        commands,
        reply: `${decision.message}${idFeedback}${tokenFeedback}`,
        responseId,
      };
    }

    if (decision.toolCalls.length === 0) {
      const note = "No tool call returned.";
      onStep?.(`Step ${step}: ${note}`);
      continue;
    }

    const executedTools: string[] = [];
    const currentStepToolResults: ToolResultLog[] = [];
    const toolCalls = decision.toolCalls.slice(0, 3);
    for (const toolCall of toolCalls) {
      if (toolCall.tool === "get_layer_order") {
        const layerOrder = getLayerOrderFromScene(workingScene);
        currentStepToolResults.push({
          data: {
            bottomToTop: [...layerOrder].reverse(),
            topToBottom: layerOrder,
          },
          status: "executed",
          step,
          tool: toolCall.tool,
        });
        executedTools.push(toolCall.tool);
        continue;
      }

      if (toolCall.tool === "analyze_scene_overlaps") {
        const overlapReport = analyzeSceneOverlapsFromScene(
          workingScene,
          toolCall.args.padding ?? 0,
        );
        currentStepToolResults.push({
          data: overlapReport,
          status: "executed",
          step,
          tool: toolCall.tool,
        });
        executedTools.push(toolCall.tool);
        continue;
      }

      if (toolCall.tool === "find_text_slot") {
        const slot = findTextSlotFromScene(workingScene, {
          height: toolCall.args.height,
          padding: toolCall.args.padding,
          preferredTop: toolCall.args.preferredTop,
          width: toolCall.args.width,
        });
        currentStepToolResults.push({
          data: slot,
          status: "executed",
          step,
          tool: toolCall.tool,
        });
        executedTools.push(toolCall.tool);
        continue;
      }

      if (toolCall.tool === "get_items_in_video_area") {
        const report = getItemsInVideoAreaFromScene(
          workingScene,
          toolCall.args.visibleOnly ?? false,
        );
        currentStepToolResults.push({
          data: report,
          status: "executed",
          step,
          tool: toolCall.tool,
        });
        executedTools.push(toolCall.tool);
        continue;
      }

      if (toolCall.tool === "get_item_geometry") {
        const report = getItemGeometryFromScene(workingScene, toolCall.args.ids);
        currentStepToolResults.push({
          data: report,
          status: "executed",
          step,
          tool: toolCall.tool,
        });
        executedTools.push(toolCall.tool);
        continue;
      }

      if (toolCall.tool === "create_text_layout") {
        const layout = createTextLayoutFromScene(workingScene, {
          blocks: toolCall.args.blocks,
          region: toolCall.args.region,
        });
        currentStepToolResults.push({
          data: layout,
          status: "executed",
          step,
          tool: toolCall.tool,
        });
        executedTools.push(toolCall.tool);
        continue;
      }

      const signature = getToolCallSignature(toolCall);
      if (executedToolCallSignatures.has(signature)) {
        const skippedStepLog: AgentStepLog = {
          step,
          result: `Skipped duplicate tool call: ${signature}`,
        };
        latestStepLog = skippedStepLog;
        currentStepToolResults.push({
          duplicateSignature: signature,
          status: "skipped",
          step,
          tool: toolCall.tool,
        });
        continue;
      }

      const command = applyToolCallToWorkingScene(
        toolCall,
        nextGeneratedId,
        workingScene,
      );
      if (!command) continue;

      emitAIEditorCommand(command);
      executedToolCallSignatures.add(signature);
      executedCommandCount += 1;
      executedTools.push(toolCall.tool);
      commands.push(command);
      const createdId = getCreatedItemId(command);
      if (createdId) {
        createdItemIds.push(createdId);
      }
      currentStepToolResults.push({
        ...(createdId ? { createdId } : {}),
        status: "executed",
        step,
        tool: toolCall.tool,
      });
    }
    emitAIStepComplete({
      step,
      toolCount: executedTools.length,
    });

    if (executedTools.length === 0) {
      const note = "Tool calls were not executable.";
      onStep?.(`Step ${step}: ${note}`);
      continue;
    }

    if (refreshSceneContext) {
      try {
        const latestSceneContext = await Promise.resolve(refreshSceneContext());
        workingScene = cloneSceneContext(latestSceneContext);
      } catch {
        // Keep the predicted scene when a refresh fails.
      }
    }

    const summary = `Executed tools: ${executedTools.join(", ")}`;
    const createdIdSummary =
      createdItemIds.length > 0
        ? ` | created IDs: ${createdItemIds.join(", ")}`
        : "";

    const stepLog: AgentStepLog = { result: `${summary}${createdIdSummary}`, step };
    latestStepLog = stepLog;
    latestStepToolResults = currentStepToolResults;
    onStep?.(
      `Step ${step}: ${summary}${createdIdSummary} | tokens in/out: ${totalInputTokens}/${totalOutputTokens}`,
    );
  }

  const idFeedback =
    createdItemIds.length > 0
      ? `\n\nCreated item IDs: ${createdItemIds.join(", ")}`
      : "";
  return {
    commands,
    reply:
      executedCommandCount > 0
        ? `Reached step limit (${MAX_AGENT_STEPS}). Executed ${executedCommandCount} tool call(s).${idFeedback}\n\nToken usage (in/out): ${totalInputTokens}/${totalOutputTokens}.`
        : `Reached step limit (${MAX_AGENT_STEPS}) without executable tools.`,
    responseId,
  };
}

/** Extracts token usage totals from generateObject result metadata. */
function getUsage(result: { usage?: unknown }) {
  const usage = result.usage as
    | {
        inputTokens?: number;
        outputTokens?: number;
      }
    | undefined;
  return {
    inputTokens:
      typeof usage?.inputTokens === "number" ? usage.inputTokens : 0,
    outputTokens:
      typeof usage?.outputTokens === "number" ? usage.outputTokens : 0,
  };
}

/** Creates a stable signature for duplicate tool-call detection within a run. */
function getToolCallSignature(toolCall: unknown) {
  return JSON.stringify(toolCall);
}

/** Returns created item custom ID for add commands. */
function getCreatedItemId(command: AIEditorCommand): string | null {
  if (
    command.type === "add_circle" ||
    command.type === "add_image" ||
    command.type === "add_line" ||
    command.type === "add_polygon" ||
    command.type === "add_rectangle" ||
    command.type === "add_text"
  ) {
    return command.customId ?? null;
  }
  return null;
}

/** Generates an image data URL using OpenAI image API. */
export async function generateOpenAIImageDataUrl(
  prompt: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_OPENAI_API_KEY in environment.");
  }

  const baseUrl =
    import.meta.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
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
    throw new Error("OpenAI image generation returned no data.");
  }

  if (first.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  if (first.url) return first.url;

  throw new Error("OpenAI image generation payload missing image output.");
}
