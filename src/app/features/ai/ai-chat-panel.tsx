import { useEffect, useMemo, useRef, useState } from "react";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useSelector } from "react-redux";
import {
  AI_IMAGE_STATUS_EVENT,
  emitAIEditorCommand,
  type AIImageStatusPayload,
} from "./editor-ai-events";
import type { RootState } from "../../store";
import { generateOpenAIChatTurn } from "./openai-chat";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function shouldApplyEditorCommands(prompt: string) {
  return /\b(add|create|insert|draw|place|make|update|edit|change|move|rotate|scale|delete|remove)\b/i.test(prompt);
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AIChatPanel() {
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingImageOps, setPendingImageOps] = useState(0);
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const itemsRecord = useSelector((state: RootState) => state.editor.itemsRecord);
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId("m"),
      role: "assistant",
      text: "Describe a shot and I can add starter elements to the canvas.",
    },
  ]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isGenerating,
    [input, isGenerating],
  );
  const isGeneratingImage = pendingImageOps > 0;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [isGenerating, messages]);

  useEffect(() => {
    const onImageStatus = (event: Event) => {
      const customEvent = event as CustomEvent<AIImageStatusPayload>;
      if (customEvent.detail.status === "start") {
        setPendingImageOps((prev) => prev + 1);
      } else {
        setPendingImageOps((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener(AI_IMAGE_STATUS_EVENT, onImageStatus as EventListener);
    return () => {
      window.removeEventListener(
        AI_IMAGE_STATUS_EVENT,
        onImageStatus as EventListener,
      );
    };
  }, []);

  const send = async () => {
    if (isGenerating) return;
    const prompt = input.trim();
    if (!prompt) return;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: createId("m"), role: "user", text: prompt },
    ]);
    setIsGenerating(true);

    try {
      const sceneContext = {
        selectedId,
        items: canvasItemIds.map((id) => ({
          id,
          name: itemsRecord[id]?.name ?? id,
          keyframeTimes: (itemsRecord[id]?.keyframe ?? []).map((keyframe) => keyframe.timestamp),
        })),
      };
      const turn = await generateOpenAIChatTurn(
        prompt,
        sceneContext,
        lastResponseId,
      );
      setMessages((prev) => [
        ...prev,
        { id: createId("m"), role: "assistant", text: turn.reply },
      ]);
      setLastResponseId(turn.responseId);
      if (shouldApplyEditorCommands(prompt)) {
        turn.commands.forEach((command) => emitAIEditorCommand(command));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      setMessages((prev) => [
        ...prev,
        {
          id: createId("m"),
          role: "assistant",
          text: `AI request failed: ${message}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
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
        <ScrollArea.Viewport ref={viewportRef} className="h-full w-full p-2">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded px-2 py-1.5 text-xs ${
                  message.role === "assistant"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-sky-500/15 text-sky-100"
                }`}
              >
                {message.text}
              </div>
            ))}
            {isGenerating ? (
              <div className="inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-300">
                <ReloadIcon className="size-3.5 animate-spin" />
                <span>Thinking…</span>
              </div>
            ) : null}
            {isGeneratingImage ? (
              <div className="inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs text-sky-200">
                <ReloadIcon className="size-3.5 animate-spin" />
                <span>Generating image…</span>
              </div>
            ) : null}
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
            disabled={isGenerating}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder='Message AI scene builder, e.g. "Add a circle and title text"'
            rows={2}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              void send();
            }}
            className="mb-0.5 inline-flex size-9 items-center justify-center rounded-full border border-sky-500/60 bg-sky-500/15 text-sky-200 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
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
