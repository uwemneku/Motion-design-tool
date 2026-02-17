import type {
  AIEditorCommand,
  AIItemKeyframe,
  AIItemPatch,
  AIItemTarget,
} from "./editor-ai-events";

type OpenAIChatResult = {
  reply: string;
  commands: AIEditorCommand[];
  responseId: string | null;
};

export type OpenAISceneContext = {
  selectedId: string | null;
  items: Array<{
    id: string;
    name: string;
    keyframeTimes: number[];
  }>;
};

type OpenAIChatEnvelope = {
  reply: string;
  commands: Array<
    | { type: "add_circle"; color?: string; keyframes?: AIItemKeyframe[] }
    | { type: "add_polygon"; color?: string; keyframes?: AIItemKeyframe[] }
    | { type: "add_line"; color?: string; keyframes?: AIItemKeyframe[] }
    | { type: "add_rectangle"; color?: string; keyframes?: AIItemKeyframe[] }
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
        target?: AIItemTarget;
        props?: AIItemPatch;
        keyframes?: AIItemKeyframe[];
      }
    | {
        type: "delete_item";
        target?: AIItemTarget;
      }
  >;
};

function parseJsonPayload(content: string): OpenAIChatEnvelope | null {
  try {
    return JSON.parse(content) as OpenAIChatEnvelope;
  } catch {
    const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
    if (!fencedMatch) return null;
    try {
      return JSON.parse(fencedMatch[1]) as OpenAIChatEnvelope;
    } catch {
      return null;
    }
  }
}

function sanitizeCommands(
  commands: OpenAIChatEnvelope["commands"] | undefined,
): AIEditorCommand[] {
  if (!Array.isArray(commands)) return [];

  const sanitizeKeyframes = (keyframes: AIItemKeyframe[] | undefined) =>
    (Array.isArray(keyframes) ? keyframes : [])
      .map((keyframe) => ({
        time:
          typeof keyframe.time === "number" && Number.isFinite(keyframe.time)
            ? keyframe.time
            : Number.NaN,
        left:
          typeof keyframe.left === "number" && Number.isFinite(keyframe.left)
            ? keyframe.left
            : undefined,
        top:
          typeof keyframe.top === "number" && Number.isFinite(keyframe.top)
            ? keyframe.top
            : undefined,
        scaleX:
          typeof keyframe.scaleX === "number" &&
          Number.isFinite(keyframe.scaleX)
            ? keyframe.scaleX
            : undefined,
        scaleY:
          typeof keyframe.scaleY === "number" &&
          Number.isFinite(keyframe.scaleY)
            ? keyframe.scaleY
            : undefined,
        opacity:
          typeof keyframe.opacity === "number" &&
          Number.isFinite(keyframe.opacity)
            ? keyframe.opacity
            : undefined,
        angle:
          typeof keyframe.angle === "number" && Number.isFinite(keyframe.angle)
            ? keyframe.angle
            : undefined,
      }))
      .filter((keyframe) => Number.isFinite(keyframe.time));

  const sanitizeColor = (color: string | undefined) => {
    const value = color?.trim();
    return value && value.length > 0 ? value : undefined;
  };

  const sanitizeTarget = (
    target: AIItemTarget | undefined,
  ): AIItemTarget | null => {
    if (!target) return null;
    const id = target.id?.trim();
    const name = target.name?.trim();
    if (!id && !name) return null;
    return { ...(id ? { id } : {}), ...(name ? { name } : {}) };
  };

  const sanitizeProps = (
    props: AIItemPatch | undefined,
  ): AIItemPatch | undefined => {
    if (!props) return undefined;
    const next: AIItemPatch = {};
    if (typeof props.left === "number" && Number.isFinite(props.left))
      next.left = props.left;
    if (typeof props.top === "number" && Number.isFinite(props.top))
      next.top = props.top;
    if (typeof props.scaleX === "number" && Number.isFinite(props.scaleX))
      next.scaleX = props.scaleX;
    if (typeof props.scaleY === "number" && Number.isFinite(props.scaleY))
      next.scaleY = props.scaleY;
    if (typeof props.opacity === "number" && Number.isFinite(props.opacity))
      next.opacity = props.opacity;
    if (typeof props.angle === "number" && Number.isFinite(props.angle))
      next.angle = props.angle;
    if (typeof props.text === "string" && props.text.trim().length > 0)
      next.text = props.text.trim();
    return Object.keys(next).length > 0 ? next : undefined;
  };

  const result: AIEditorCommand[] = [];

  for (const command of commands) {
    if (command.type === "add_circle") {
      result.push({
        type: "add_circle",
        color: sanitizeColor(command.color),
        keyframes: sanitizeKeyframes(command.keyframes),
      });
      continue;
    }

    if (command.type === "add_polygon") {
      result.push({
        type: "add_polygon",
        color: sanitizeColor(command.color),
        keyframes: sanitizeKeyframes(command.keyframes),
      });
      continue;
    }

    if (command.type === "add_text") {
      result.push({
        type: "add_text",
        text: command.text?.trim(),
        color: sanitizeColor(command.color),
        keyframes: sanitizeKeyframes(command.keyframes),
      });
      continue;
    }

    if (command.type === "add_line") {
      result.push({
        type: "add_line",
        color: sanitizeColor(command.color),
        keyframes: sanitizeKeyframes(command.keyframes),
      });
      continue;
    }

    if (command.type === "add_rectangle") {
      result.push({
        type: "add_rectangle",
        color: sanitizeColor(command.color),
        keyframes: sanitizeKeyframes(command.keyframes),
      });
      continue;
    }

    if (command.type === "add_image") {
      const url = command.url?.trim();
      const prompt = command.prompt?.trim();
      if (!url && !prompt) continue;
      result.push({
        type: "add_image",
        url,
        prompt,
        keyframes: sanitizeKeyframes(command.keyframes),
      });
      continue;
    }

    if (command.type === "update_item") {
      const target = sanitizeTarget(command.target);
      if (!target) continue;
      const props = sanitizeProps(command.props);
      const keyframes = sanitizeKeyframes(command.keyframes);
      result.push({
        type: "update_item",
        target,
        ...(props ? { props } : {}),
        ...(keyframes.length > 0 ? { keyframes } : {}),
      });
      continue;
    }

    if (command.type === "delete_item") {
      const target = sanitizeTarget(command.target);
      if (!target) continue;
      result.push({
        type: "delete_item",
        target,
      });
    }
  }

  return result;
}

export async function generateOpenAIChatTurn(
  prompt: string,
  sceneContext: OpenAISceneContext,
  previousResponseId?: string | null,
): Promise<OpenAIChatResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_OPENAI_API_KEY in environment.");
  }

  const baseUrl =
    import.meta.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = import.meta.env.VITE_OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      instructions:
        'You are a motion editor copilot. Respond ONLY with JSON: {"reply":"string","commands":[{"type":"add_circle"|"add_polygon"|"add_line"|"add_rectangle"|"add_text"|"add_image"|"update_item"|"delete_item","target?":{"id?":"string","name?":"string"},"props?":{"left?":number,"top?":number,"scaleX?":number,"scaleY?":number,"opacity?":number,"angle?":number,"text?":"string"},"text?":"string","color?":"string","url?":"string","prompt?":"string","keyframes?":[{"time":number,"left?":number,"top?":number,"scaleX?":number,"scaleY?":number,"opacity?":number,"angle?":number}]}]}. Use target.id when available from context. Keep commands empty unless user explicitly asks to change scene content. For shape/text creation, set "color" when the user specifies a color. For images use add_image with url; if unavailable, use prompt for generation. Any generated image must be PNG format and must not exceed 2MB.',
      input: `Scene context:\n${JSON.stringify(sceneContext)}\n\nUser request:\n${prompt}`,
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      text: {
        format: {
          type: "json_schema",
          name: "motion_editor_command_response",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["reply", "commands"],
            properties: {
              reply: { type: "string" },
              commands: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "type",
                    "text",
                    "color",
                    "url",
                    "prompt",
                    "target",
                    "props",
                    "keyframes",
                  ],
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "add_circle",
                        "add_polygon",
                        "add_line",
                        "add_rectangle",
                        "add_text",
                        "add_image",
                        "update_item",
                        "delete_item",
                      ],
                    },
                    text: { type: ["string", "null"] },
                    color: { type: ["string", "null"] },
                    url: { type: ["string", "null"] },
                    prompt: { type: ["string", "null"] },
                    target: {
                      type: "object",
                      additionalProperties: false,
                      required: ["id", "name"],
                      properties: {
                        id: { type: ["string", "null"] },
                        name: { type: ["string", "null"] },
                      },
                    },
                    props: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "left",
                        "top",
                        "scaleX",
                        "scaleY",
                        "opacity",
                        "angle",
                        "text",
                      ],
                      properties: {
                        left: { type: ["number", "null"] },
                        top: { type: ["number", "null"] },
                        scaleX: { type: ["number", "null"] },
                        scaleY: { type: ["number", "null"] },
                        opacity: { type: ["number", "null"] },
                        angle: { type: ["number", "null"] },
                        text: { type: ["string", "null"] },
                      },
                    },
                    keyframes: {
                      anyOf: [
                        { type: "null" },
                        {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            required: [
                              "time",
                              "left",
                              "top",
                              "scaleX",
                              "scaleY",
                              "opacity",
                              "angle",
                            ],
                            properties: {
                              time: { type: ["number", "null"] },
                              left: { type: ["number", "null"] },
                              top: { type: ["number", "null"] },
                              scaleX: { type: ["number", "null"] },
                              scaleY: { type: ["number", "null"] },
                              opacity: { type: ["number", "null"] },
                              angle: { type: ["number", "null"] },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    id?: string;
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const fallbackText =
    data.output
      ?.flatMap((entry) => entry.content ?? [])
      .find((content) => content.type === "output_text" && content.text)
      ?.text ?? null;
  const content = (data.output_text ?? fallbackText ?? "").trim();
  if (!content) {
    throw new Error("OpenAI response was empty.");
  }

  const parsed = parseJsonPayload(content);
  if (!parsed) {
    return {
      reply: content,
      commands: [],
      responseId: data.id ?? null,
    };
  }

  return {
    reply: parsed.reply?.trim() || "I generated scene actions.",
    commands: sanitizeCommands(parsed.commands),
    responseId: data.id ?? null,
  };
}

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
