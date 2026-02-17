export type AIEditorCommand =
  | { type: "add_circle" }
  | { type: "add_polygon" }
  | { type: "add_text"; text?: string };

export const AI_EDITOR_COMMAND_EVENT = "ai-editor-command";

export function emitAIEditorCommand(command: AIEditorCommand) {
  window.dispatchEvent(
    new CustomEvent<AIEditorCommand>(AI_EDITOR_COMMAND_EVENT, {
      detail: command,
    }),
  );
}
