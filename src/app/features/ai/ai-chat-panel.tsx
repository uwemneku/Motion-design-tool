/** Ai Chat Panel.Tsx module implementation. */
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppScrollArea } from "../../components/app-scroll-area";
import { SpinnerStatusRow } from "../../components/spinner-status-row";
import { store, type RootState } from "../../store";
import { TIMELINE_DURATION } from "../../../const";
import type { CanvasAppContextValue } from "../canvas/canvas-context/canvas-app-context";
import { useCanvasAppContext } from "../canvas/hooks/use-canvas-app-context";
import {
  AI_ACTION_STATUS_EVENT,
  AI_IMAGE_STATUS_EVENT,
  type AIActionStatusPayload,
  type AIImageStatusPayload,
} from "./editor-ai-events";
import { buildCompactSceneItemContext } from "./scene-context";
import { generateOpenAIChatTurn } from "./openai-chat";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

/** Chat panel for AI-assisted scene authoring and status feedback. */
export default function AIChatPanel() {
  const { getInstanceById } = useCanvasAppContext();
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [pendingActionOps, setPendingActionOps] = useState(0);
  const [pendingImageOps, setPendingImageOps] = useState(0);
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
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
  const isApplyingActions = pendingActionOps > 0;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [isGenerating, messages]);

  useEffect(() => {
    const onActionStatus = (event: Event) => {
      const customEvent = event as CustomEvent<AIActionStatusPayload>;
      if (customEvent.detail.status === "start") {
        setPendingActionOps((prev) => prev + 1);
      } else {
        setPendingActionOps((prev) => Math.max(0, prev - 1));
      }
    };

    const onImageStatus = (event: Event) => {
      const customEvent = event as CustomEvent<AIImageStatusPayload>;
      if (customEvent.detail.status === "start") {
        setPendingImageOps((prev) => prev + 1);
      } else {
        setPendingImageOps((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener(
      AI_ACTION_STATUS_EVENT,
      onActionStatus as EventListener,
    );
    window.addEventListener(
      AI_IMAGE_STATUS_EVENT,
      onImageStatus as EventListener,
    );
    return () => {
      window.removeEventListener(
        AI_ACTION_STATUS_EVENT,
        onActionStatus as EventListener,
      );
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
    setAgentSteps([]);

    try {
      const sceneContext = buildOpenAISceneContext(
        store.getState(),
        getInstanceById,
      );
      const turn = await generateOpenAIChatTurn(
        prompt,
        sceneContext,
        lastResponseId,
        (stepMessage) => {
          setAgentSteps((prev) => [...prev, stepMessage]);
        },
        () => buildOpenAISceneContext(store.getState(), getInstanceById),
      );
      setMessages((prev) => [
        ...prev,
        { id: createId("m"), role: "assistant", text: turn.reply },
      ]);
      setLastResponseId(turn.responseId);
    } catch (error) {
      console.log({ error });

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
    <section className="flex min-h-0 max-h-[50dvh] flex-1 flex-col border-t border-[var(--wise-border)] pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">AI Scene Chat</h3>
        <span className="rounded-full border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-0.5 text-[10px] text-slate-400">
          Agent loop
        </span>
      </div>

      <AppScrollArea
        rootClassName="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--wise-border)] bg-[var(--wise-surface-raised)]"
        viewportClassName="h-full w-full p-2"
        verticalScrollbarClassName="flex w-2.5 touch-none select-none bg-[var(--wise-surface-raised)] p-0.5"
      >
        <div ref={viewportRef} className="h-full w-full">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded px-2 py-1.5 text-xs ${
                  message.role === "assistant"
                    ? "bg-[var(--wise-surface-muted)] text-slate-100"
                    : "bg-[var(--wise-accent)]/15 text-[#dbe5ff]"
                }`}
              >
                <ChatMarkdown content={message.text} />
              </div>
            ))}
            {isGenerating ? (
              <div className="space-y-1 rounded px-2 py-1.5 text-xs text-slate-300">
                <SpinnerStatusRow text="Agent running…" />
                {agentSteps.length > 0 ? (
                  <div className="space-y-0.5 text-[11px] text-slate-400">
                    {agentSteps.slice(-6).map((step, index) => (
                      <div key={`${step}-${index}`}>{step}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {isApplyingActions ? (
              <SpinnerStatusRow text="Applying actions…" />
            ) : null}
            {isGeneratingImage ? (
              <SpinnerStatusRow text="Generating image…" />
            ) : null}
          </div>
        </div>
      </AppScrollArea>

      <div className="mt-2 rounded-2xl border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-2 shadow-[0_6px_22px_rgba(2,6,23,0.35)]">
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
            className="mb-0.5 inline-flex size-9 items-center justify-center rounded-full border border-[var(--wise-accent)]/60 bg-[var(--wise-accent)]/20 text-[#dbe5ff] transition-colors hover:bg-[var(--wise-accent)]/30 disabled:cursor-not-allowed disabled:opacity-50"
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

type ChatMarkdownProps = {
  content: string;
};

/** Markdown renderer for AI/user chat message bodies. */
function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-1 list-disc pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-1 list-decimal pl-5">{children}</ol>
        ),
        code: ({ children, className }) => (
          <code
            className={`rounded bg-[var(--wise-surface)]/70 px-1 py-0.5 ${className ?? ""}`}
          >
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-[#afc6ff] underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** Builds the latest AI scene context directly from Redux state and canvas instances. */
function buildOpenAISceneContext(
  state: RootState,
  getInstanceById: CanvasAppContextValue["getInstanceById"],
) {
  const { canvasItemIds, itemsRecord, projectInfo, selectedId } = state.editor;
  return {
    selectedId,
    project: {
      ...projectInfo,
      durationSeconds: TIMELINE_DURATION,
    },
    items: canvasItemIds.map((id) => ({
      ...buildCompactSceneItemContext(
        id,
        itemsRecord[id]?.name ?? id,
        (itemsRecord[id]?.keyframe ?? []).map((keyframe) => keyframe.timestamp),
        getInstanceById(id),
      ),
    })),
  };
}

function createId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
