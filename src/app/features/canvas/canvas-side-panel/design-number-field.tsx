/** Numeric field component with local typing and pointer scrubbing behavior. */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { KeyframeActionButton, PrefixedField, PrefixScrubHandle } from "./design-components";
import { buildScrubbedFieldValue, NUMERIC_INPUT_PATTERN } from "./design-helpers";
import type { NumericScrubField } from "./design-helpers";
import { labelClass } from "./util";

type DesignNumberFieldProps = {
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
  showKeyframeAction?: boolean;
};

type ScrubSession = {
  pointerId: number;
  startValue: number;
  startX: number;
};

/** Renders one numeric inspector field with local editing and scrub state. */
export default function DesignNumberField({
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
  showKeyframeAction = true,
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

      const nextValue = buildScrubbedFieldValue(
        field,
        session.startValue,
        event.clientX - session.startX,
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
      const nextValue = buildScrubbedFieldValue(
        field,
        session.startValue,
        deltaX,
        event.shiftKey,
        event.altKey,
      );

      scrubSessionRef.current = null;
      document.body.classList.remove("cursor-ew-resize", "select-none");
      draftValueRef.current = nextValue;
      setDraftValue(nextValue);
      setIsEditing(false);
      if (Math.abs(deltaX) < 1) return;
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

  /** Starts pointer scrubbing for the compact field prefix. */
  const onPrefixPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    const startValue = Number(draftValueRef.current);
    if (!Number.isFinite(startValue)) return;

    scrubSessionRef.current = {
      pointerId: event.pointerId,
      startValue,
      startX: event.clientX,
    };
    setIsEditing(true);
    document.body.classList.add("cursor-ew-resize", "select-none");
    event.preventDefault();
  };

  /** Commits on Enter to match the compact inspector input behavior. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitCurrentValue(true);
  };

  return (
    <label className={labelClass}>
      <span className={isSecondaryLabel ? "text-transparent" : "text-[#d5d8e1]"}>
        {groupLabel}
      </span>
      <PrefixedField>
        <PrefixScrubHandle prefix={prefix} onPointerDown={onPrefixPointerDown} />
        {showKeyframeAction ? (
          <KeyframeActionButton
            isKeyframed={isKeyframed}
            label={keyframeLabel}
            onAddKeyframe={onAddKeyframe}
            className={inputClassName}
          />
        ) : null}
        <input
          data-shape-id={shapeId ?? ""}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onBlur={() => {
            commitCurrentValue(true);
          }}
          onKeyDown={onKeyDown}
          className={`h-full w-full bg-transparent pl-2 font-[var(--wise-font-mono)] text-[11px] tracking-[0.01em] text-[#f6f7fb] outline-none ${
            showKeyframeAction ? "pr-9" : "pr-2.5"
          }`}
        />
      </PrefixedField>
    </label>
  );
}
