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
  applyToolCallToWorkingScene,
  AVAILABLE_TOOLS_PROMPT_TEXT,
  toolCallSchema,
} from "./tools";
import { AGENT_SYSTEM_PROMPT, MAX_AGENT_STEPS } from "../../../const";

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
  }>;
};

type AgentStepLog = {
  result: string;
  step: number;
};

type ToolResultLog = {
  command?: AIEditorCommand;
  duplicateSignature?: string;
  createdId?: string;
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
  workingScene: OpenAISceneContext,
  step: number,
  latestStepLog: AgentStepLog | null,
  latestStepToolResults: ToolResultLog[],
) {
  const latestStepSummary = latestStepLog
    ? `- Step ${latestStepLog.step}: ${latestStepLog.result}`
    : "- none";
  const latestToolResultsText =
    latestStepToolResults.length > 0
      ? latestStepToolResults
          .map((entry) =>
            JSON.stringify({
              command: entry.command,
              duplicateSignature: entry.duplicateSignature,
              createdId: entry.createdId,
              status: entry.status,
              step: entry.step,
              tool: entry.tool,
            }),
          )
          .join("\n")
      : "- none";
  const project = workingScene.project;
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
    `Available tool(s): ${AVAILABLE_TOOLS_PROMPT_TEXT}`,
    "Rules:",
    "- Use toolCalls to request execution of frontend tools.",
    "- You may call add_circle/add_polygon/add_line/add_rectangle/add_text " +
      "multiple times in one step.",
    "- Each created item gets a customId. Reuse that id with update_item_by_id " +
      "to edit properties or append keyframes.",
    "- Do not repeat a previously executed identical tool call unless " +
      "arguments change.",
    "- Always base placement calculations on video area bounds, not full canvas.",
    "- Use videoAreaReferencePoints below as the primary placement reference.",
    "- Video area bounds are: left=videoLeft, top=videoTop, right=videoRight, bottom=videoBottom.",
    "- Compose inside video area by default unless user explicitly requests off-frame placement.",
    "- Fabric objects are center-anchored: left/top are center coordinates.",
    "- Use center-origin bounds math: leftBound=centerX-scaledWidth/2, " +
      "rightBound=centerX+scaledWidth/2, topBound=centerY-scaledHeight/2, " +
      "bottomBound=centerY+scaledHeight/2.",
    "- Keyframe structure: item.keyframeTimes is a flat list of timestamps; " +
      "item.keyframes contains per-property frame arrays where each frame " +
      "is { id, time, value }.",
    "- Use keyframes for property-specific reasoning (left/top/scale/opacity/angle/fill/stroke), " +
      "not just keyframeTimes.",
    '- Return status="done" only when objective is complete.',
    '- Return status="needs_user_input" when blocked.',
    "Scene context JSON:",
    "```json",
    JSON.stringify(workingScene, null, 2),
    "```",
    "Video area reference points JSON:",
    "```json",
    JSON.stringify(videoAnchors, null, 2),
    "```",
    "Latest step summary (incremental; earlier steps are in conversation context):",
    latestStepSummary,
    "Latest tool results (JSON lines; incremental):",
    latestToolResultsText,
  ].join("\n\n");
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
  const logs: AgentStepLog[] = [];
  let latestStepLog: AgentStepLog | null = null;
  let latestStepToolResults: ToolResultLog[] = [];
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

    const result = await generateObject({
      model: openai(model),
      ...(shouldSendSystemPrompt
        ? {
            system: AGENT_SYSTEM_PROMPT,
          }
        : {}),
      schema: stepDecisionSchema,
      prompt: buildLoopStepPrompt(
        prompt,
        workingScene,
        step,
        latestStepLog,
        latestStepToolResults,
      ),
      ...(responseId
        ? {
            providerOptions: {
              openai: {
                previousResponseId: responseId,
                reasoningEffort: "minimal",
                systemMessageMode: "developer",
                textVerbosity: "medium",
              },
            },
          }
        : {
            providerOptions: {
              openai: {
                reasoningEffort: "minimal",
                systemMessageMode: "developer",
                textVerbosity: "medium",
              },
            },
          }),
    });
    shouldSendSystemPrompt = false;

    responseId = getOpenAIResponseId(result.providerMetadata) ?? responseId;
    const decision = result.object;

    if (decision.status === "done") {
      onStep?.(`Step ${step}: objective complete.`);
      const idFeedback =
        createdItemIds.length > 0
          ? `\n\nCreated item IDs: ${createdItemIds.join(", ")}`
          : "";
      return {
        commands,
        reply: `${decision.message}${idFeedback}`,
        responseId,
      };
    }

    if (decision.status === "needs_user_input") {
      onStep?.(`Step ${step}: waiting for user input.`);
      const idFeedback =
        createdItemIds.length > 0
          ? `\n\nCreated item IDs: ${createdItemIds.join(", ")}`
          : "";
      return {
        commands,
        reply: `${decision.message}${idFeedback}`,
        responseId,
      };
    }

    if (decision.toolCalls.length === 0) {
      const note = "No tool call returned.";
      logs.push({ result: note, step });
      onStep?.(`Step ${step}: ${note}`);
      continue;
    }

    const executedTools: string[] = [];
    const currentStepToolResults: ToolResultLog[] = [];
    for (const toolCall of decision.toolCalls) {
      const signature = getToolCallSignature(toolCall);
      if (executedToolCallSignatures.has(signature)) {
        const skippedStepLog: AgentStepLog = {
          step,
          result: `Skipped duplicate tool call: ${signature}`,
        };
        logs.push(skippedStepLog);
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
        command,
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
      logs.push({ result: note, step });
      onStep?.(`Step ${step}: ${note}`);
      continue;
    }

    if (refreshSceneContext) {
      try {
        const latestSceneContext = await Promise.resolve(refreshSceneContext());
        workingScene = cloneSceneContext(latestSceneContext);
      } catch {
        logs.push({
          step,
          result: "Context refresh failed. Continuing with predicted scene.",
        });
      }
    }

    const summary = `Executed tools: ${executedTools.join(", ")}`;
    const createdIdSummary =
      createdItemIds.length > 0
        ? ` | created IDs: ${createdItemIds.join(", ")}`
        : "";

    const stepLog: AgentStepLog = { result: `${summary}${createdIdSummary}`, step };
    logs.push(stepLog);
    latestStepLog = stepLog;
    latestStepToolResults = currentStepToolResults;
    onStep?.(`Step ${step}: ${summary}${createdIdSummary}`);
  }

  const idFeedback =
    createdItemIds.length > 0
      ? `\n\nCreated item IDs: ${createdItemIds.join(", ")}`
      : "";
  return {
    commands,
    reply:
      executedCommandCount > 0
        ? `Reached step limit (${MAX_AGENT_STEPS}). Executed ${executedCommandCount} tool call(s).${idFeedback}`
        : `Reached step limit (${MAX_AGENT_STEPS}) without executable tools.`,
    responseId,
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
