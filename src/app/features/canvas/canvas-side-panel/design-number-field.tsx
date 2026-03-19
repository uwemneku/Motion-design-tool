/** Numeric field component with local typing and pointer scrubbing behavior. */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { KeyframeActionButton, PrefixedField, PrefixScrubHandle } from "./design-components";
import { buildScrubbedFieldValue, NUMERIC_INPUT_PATTERN } from "./design-helpers";
import type { NumericScrubField } from "./design-helpers";
import { labelClass } from "./util";

type DesignNumberFieldProps = {
  axisPlacement?: "leading" | "trailing";
  field: NumericScrubField;
  groupLabel: string;
  inputClassName?: string;
  inputValue: string;
  isKeyframed: boolean;
  isSecondaryLabel: boolean;
  keyframeLabel: string;
  onAddKeyframe: () => void;
  onCommitValue: (
    field: NumericScrubField,
    value: string,
    shouldKeyframe: boolean,
  ) => void;
  prefix: string;
  shapeId: string | null;
  showPrefix?: boolean;
  showKeyframeAction?: boolean;
  showGroupLabel?: boolean;
};

type ScrubSession = {
  focusTarget: HTMLInputElement | null;
  hasScrubbed: boolean;
  pointerId: number;
  startValue: number;
  startX: number;
};

const SCRUB_START_THRESHOLD = 4;

/** Renders one numeric inspector field with local editing and scrub state. */
export default function DesignNumberField({
  axisPlacement = "leading",
  field,
  groupLabel,
  inputClassName,
  inputValue,
  isKeyframed,
  isSecondaryLabel,
  keyframeLabel,
  onAddKeyframe,
  onCommitValue,
  prefix,
  shapeId,
  showPrefix = true,
  showKeyframeAction = true,
  showGroupLabel = true,
}: DesignNumberFieldProps) {
  const [draftValue, setDraftValue] = useState(inputValue);
  const [isEditing, setIsEditing] = useState(false);
  const draftValueRef = useRef(inputValue);
  const scrubSessionRef = useRef<ScrubSession | null>(null);
  const displayValue = isEditing ? draftValue : inputValue;

  useEffect(() => {
    if (isEditing) return;
    draftValueRef.current = inputValue;
  }, [inputValue, isEditing, shapeId]);

  useEffect(() => {
    /** Updates the scrubbed value while the pointer moves over the field. */
    const onWindowPointerMove = (event: PointerEvent) => {
      const session = scrubSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const deltaX = event.clientX - session.startX;
      if (!session.hasScrubbed && Math.abs(deltaX) < SCRUB_START_THRESHOLD) return;

      if (!session.hasScrubbed) {
        session.hasScrubbed = true;
        document.body.classList.add("cursor-ew-resize", "select-none");
      }

      const nextValue = buildScrubbedFieldValue(
        field,
        session.startValue,
        deltaX,
        event.shiftKey,
        event.altKey,
      );

      draftValueRef.current = nextValue;
      setIsEditing(true);
      setDraftValue(nextValue);
      onCommitValue(field, nextValue, false);
    };

    /** Commits the final scrubbed value once the pointer is released. */
    const onWindowPointerUp = (event: PointerEvent) => {
      const session = scrubSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const deltaX = event.clientX - session.startX;
      scrubSessionRef.current = null;
      document.body.classList.remove("cursor-ew-resize", "select-none");

      if (!session.hasScrubbed) {
        session.focusTarget?.focus();
        return;
      }

      const nextValue = buildScrubbedFieldValue(
        field,
        session.startValue,
        deltaX,
        event.shiftKey,
        event.altKey,
      );

      draftValueRef.current = nextValue;
      setDraftValue(nextValue);
      setIsEditing(false);
      onCommitValue(field, nextValue, true);
    };

    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);

    return () => {
      document.body.classList.remove("cursor-ew-resize", "select-none");
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [field, onCommitValue]);

  /** Updates the draft text value while rejecting unsupported characters. */
  const onChange = (value: string) => {
    if (!NUMERIC_INPUT_PATTERN.test(value)) return;
    draftValueRef.current = value;
    setIsEditing(true);
    setDraftValue(value);
  };

  /** Commits the current typed value for the field. */
  const commitCurrentValue = (shouldKeyframe: boolean) => {
    onCommitValue(field, draftValueRef.current, shouldKeyframe);
    setIsEditing(false);
  };

  /** Starts a candidate scrub session that becomes active after a small drag threshold. */
  const startPotentialScrub = (
    event: ReactPointerEvent<HTMLElement>,
    focusTarget: HTMLInputElement | null,
  ) => {
    if (event.button !== 0) return;

    const startValue = Number(draftValueRef.current);
    if (!Number.isFinite(startValue)) return;

    scrubSessionRef.current = {
      focusTarget,
      hasScrubbed: false,
      pointerId: event.pointerId,
      startValue,
      startX: event.clientX,
    };
    event.preventDefault();
  };

  /** Starts pointer scrubbing for the compact field prefix. */
  const onPrefixPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    startPotentialScrub(event, null);
  };

  /** Lets the whole input surface begin scrubbing while a simple click still focuses the field. */
  const onInputPointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
    startPotentialScrub(event, event.currentTarget);
  };

  /** Commits on Enter to match the compact inspector input behavior. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitCurrentValue(true);
  };

  return (
    <label className={showGroupLabel ? labelClass : "block"}>
      {showGroupLabel ? (
        <span
          className={isSecondaryLabel ? "text-transparent" : "text-[var(--wise-content-secondary)]"}
        >
          {groupLabel}
        </span>
      ) : null}
      <PrefixedField>
        {showPrefix && axisPlacement === "leading" ? (
          <PrefixScrubHandle prefix={prefix} onPointerDown={onPrefixPointerDown} />
        ) : null}
        {showKeyframeAction ? (
          <KeyframeActionButton
            isKeyframed={isKeyframed}
            label={keyframeLabel}
            onAddKeyframe={onAddKeyframe}
            className={`${axisPlacement === "trailing" ? "right-4" : ""} ${inputClassName ?? ""}`}
          />
        ) : null}
        <input
          data-shape-id={shapeId ?? ""}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onPointerDown={onInputPointerDown}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onBlur={() => {
            commitCurrentValue(true);
          }}
          onKeyDown={onKeyDown}
          className={`h-full w-full cursor-ew-resize bg-transparent font-[var(--wise-font-display)] text-[11px] font-semibold tracking-[-0.015em] text-[var(--wise-content-primary)] outline-none focus:cursor-text ${
            showPrefix ? (axisPlacement === "leading" ? "pl-2" : "pl-3") : "px-2.5"
          } ${
            showKeyframeAction
              ? axisPlacement === "trailing"
                ? "pr-9"
                : "pr-9"
              : axisPlacement === "trailing"
                ? showPrefix
                  ? "pr-5.5"
                  : "pr-2.5"
                : "pr-2.5"
          }`}
        />
        {showPrefix && axisPlacement === "trailing" ? (
          <PrefixScrubHandle prefix={prefix} onPointerDown={onPrefixPointerDown} side="trailing" />
        ) : null}
      </PrefixedField>
    </label>
  );
}
