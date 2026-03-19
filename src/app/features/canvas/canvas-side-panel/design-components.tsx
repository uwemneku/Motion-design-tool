/** Render-only component helpers for the canvas design side panel. */
import { ChevronDown } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import type {
  HorizontalAlignment,
  VerticalAlignment,
} from "./design-helpers";

type FieldShellProps = {
  children: ReactNode;
  className?: string;
};

/** Wraps an editor control in the flatter inspector field shell. */
export function FieldShell({ children, className }: FieldShellProps) {
  return (
    <div
      className={`relative flex min-w-0 h-6 max-h-6 items-center rounded-[4px] bg-[var(--wise-surface-raised)] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

type PrefixedFieldProps = {
  children: ReactNode;
};

/** Renders a compact leading prefix used by transform-style fields. */
export function PrefixedField({ children }: PrefixedFieldProps) {
  return <FieldShell>{children}</FieldShell>;
}

type PrefixScrubHandleProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  prefix: string;
  side?: "leading" | "trailing";
};

/** Renders the draggable prefix token used for number scrubbing. */
export function PrefixScrubHandle({
  onPointerDown,
  prefix,
  side = "leading",
}: PrefixScrubHandleProps) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className={`h-full shrink-0 cursor-ew-resize select-none text-[10px] font-medium uppercase tracking-[0.03em] text-[var(--wise-content-secondary)] ${
        side === "leading"
          ? "border-r border-[rgba(141,171,255,0.14)] pl-1.5 pr-1"
          : "border-l border-[rgba(141,171,255,0.14)] pl-0.5 pr-1 text-[9px]"
      }`}
      aria-label={`Adjust ${prefix}`}
      title={`Drag to adjust ${prefix}`}
    >
      {prefix}
    </button>
  );
}

type KeyframeActionButtonProps = {
  className?: string;
  isKeyframed: boolean;
  label: string;
  onAddKeyframe: () => void;
  variant?: "absolute" | "inline";
};

/** Renders a compact add-keyframe action inside a property field. */
export function KeyframeActionButton({
  className,
  isKeyframed,
  label,
  onAddKeyframe,
  variant = "absolute",
}: KeyframeActionButtonProps) {
  const positionClass =
    variant === "inline"
      ? "relative shrink-0"
      : "absolute right-1.5 top-1/2 -translate-y-1/2";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onAddKeyframe();
      }}
      className={`inline-flex size-2.5 cursor-pointer items-center justify-center rotate-45 border transition ${positionClass} ${
        isKeyframed
          ? "border-[var(--wise-primary)] bg-[rgba(141,171,255,0.14)] text-[var(--wise-primary)]"
          : "border-[rgba(141,171,255,0.14)] bg-[rgba(255,255,255,0.02)] text-[var(--wise-content-secondary)] hover:border-[rgba(141,171,255,0.22)] hover:bg-white/6 hover:text-[var(--wise-content-primary)]"
      } ${className ?? ""}`}
      aria-label={`Add keyframe for ${label}`}
      title={`Add keyframe for ${label}`}
    />
  );
}

type HorizontalAlignIconProps = {
  action: HorizontalAlignment;
};

/** Renders a horizontal alignment glyph for the inspector controls. */
export function HorizontalAlignIcon({ action }: HorizontalAlignIconProps) {
  const barClass = "h-0.5 rounded-full bg-current";
  const shortBarClass = `${barClass} w-2.5`;
  const longBarClass = `${barClass} w-4`;
  const containerClass =
    action === "left" ? "items-start" : action === "center" ? "items-center" : "items-end";

  return (
    <span className={`flex w-3.5 flex-col ${containerClass} gap-[3px]`}>
      <span className={shortBarClass} />
      <span className={longBarClass} />
      <span className={shortBarClass} />
    </span>
  );
}

type VerticalAlignIconProps = {
  action: VerticalAlignment;
};

/** Renders a vertical alignment glyph for the inspector controls. */
export function VerticalAlignIcon({ action }: VerticalAlignIconProps) {
  const barClass = "w-0.5 rounded-full bg-current";
  const shortBarClass = `${barClass} h-2.5`;
  const longBarClass = `${barClass} h-4`;
  const containerClass =
    action === "top" ? "justify-start" : action === "middle" ? "justify-center" : "justify-end";

  return (
    <span className={`flex h-3.5 w-3.5 ${containerClass} items-end gap-[3px]`}>
      <span className={shortBarClass} />
      <span className={longBarClass} />
      <span className={shortBarClass} />
    </span>
  );
}

type AccordionSectionProps = {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
};

/** Wraps an inspector block in a compact accordion shell. */
export function AccordionSection({
  children,
  isOpen,
  onToggle,
  title,
}: AccordionSectionProps) {
  return (
    <section className="space-y-2 border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
      >
        <h4 className="font-[var(--wise-font-display)] text-[14px] font-semibold tracking-[-0.025em] text-[var(--wise-content-primary)]">
          {title}
        </h4>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--wise-content-secondary)] transition-transform ${isOpen ? "" : "-rotate-90"}`}
          strokeWidth={1.8}
          aria-hidden
        />
      </button>
      {isOpen ? children : null}
    </section>
  );
}
