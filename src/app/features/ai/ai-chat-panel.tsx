import { useMemo, useState } from "react";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  emitAIEditorCommand,
  type AIEditorCommand,
} from "./editor-ai-events";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parsePromptToCommands(prompt: string): AIEditorCommand[] {
  const normalized = prompt.toLowerCase();
  const commands: AIEditorCommand[] = [];

  if (normalized.includes("circle")) {
    commands.push({ type: "add_circle" });
  }
  if (normalized.includes("polygon")) {
    commands.push({ type: "add_polygon" });
  }
  if (normalized.includes("text") || normalized.includes("title")) {
    const textMatch = prompt.match(/"([^"]+)"/);
    commands.push({ type: "add_text", text: textMatch?.[1] });
  }

  if (commands.length === 0) {
    commands.push({ type: "add_text", text: "Scene title" });
    commands.push({ type: "add_circle" });
  }

  return commands;
}

function commandsToSummary(commands: AIEditorCommand[]) {
  const labels = commands.map((command) => {
    if (command.type === "add_text") {
      return command.text ? `text "${command.text}"` : "text";
    }
    return command.type.replace("add_", "").replace("_", " ");
  });

  return `I can build this scene by adding: ${labels.join(", ")}.`;
}

export default function AIChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId("m"),
      role: "assistant",
      text: "Describe a shot and I can add starter elements to the canvas.",
    },
  ]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const send = () => {
    const prompt = input.trim();
    if (!prompt) return;
    setInput("");

    const commands = parsePromptToCommands(prompt);
    const assistantText = commandsToSummary(commands);

    setMessages((prev) => [
      ...prev,
      { id: createId("m"), role: "user", text: prompt },
      { id: createId("m"), role: "assistant", text: assistantText },
    ]);

    commands.forEach((command) => emitAIEditorCommand(command));
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-slate-700 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">AI Scene Chat</h3>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
          GPT-style draft
        </span>
      </div>

      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden rounded-md border border-slate-700 bg-slate-900">
        <ScrollArea.Viewport className="h-full w-full p-2">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded px-2 py-1.5 text-xs ${
                  message.role === "assistant"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex w-2.5 touch-none select-none bg-slate-900 p-0.5"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-700" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-[0_6px_22px_rgba(2,6,23,0.35)]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder='Message AI scene builder, e.g. "Add a circle and title text"'
            rows={2}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={send}
            className="mb-0.5 inline-flex size-9 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/15 text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <PaperPlaneIcon className="size-4" />
          </button>
        </div>
        <div className="px-2 pt-1 text-[10px] text-slate-500">
          Enter to send, Shift+Enter for a new line
        </div>
      </div>
    </section>
  );
}
