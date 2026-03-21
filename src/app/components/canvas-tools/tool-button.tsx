/** Tool Button.Tsx reusable UI component. */
import * as Tooltip from "@radix-ui/react-tooltip";
import type { MouseEvent, ReactNode } from "react";
import { TOOL_BUTTON_CLASS } from "../../../const";

type ToolButtonProps = {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
};

/** Shared icon button with tooltip for canvas tool actions. */
export function ToolButton({
  active = false,
  children,
  label,
  onClick,
  onMouseDown,
}: ToolButtonProps) {
  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          onMouseDown={onMouseDown}
          aria-label={label}
          aria-pressed={active}
          className={`${TOOL_BUTTON_CLASS} ${
            active
              ? "border-[var(--wise-accent)] bg-[var(--wise-accent)]/14 text-[var(--wise-accent)]"
              : ""
          }`}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={8}
          className="z-50 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-2 py-1 text-xs text-[#e6e6e6] shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--wise-surface-raised)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
