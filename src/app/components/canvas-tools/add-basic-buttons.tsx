/** Add Basic Buttons.Tsx reusable UI component. */
import type { MouseEvent } from "react";
import { ToolButton } from "./tool-button";

type ButtonMouseDown = (event: MouseEvent<HTMLButtonElement>) => void;

type AddBasicButtonsProps = {
  onAddCircle: () => void;
  onAddLine: () => void;
  onAddRectangle: () => void;
  onAddText: () => void;
  onMouseDown: ButtonMouseDown;
};

/** Adds a circle item to the canvas. */
export function AddCircleButton({
  onAddCircle,
  onMouseDown,
}: Pick<AddBasicButtonsProps, "onAddCircle" | "onMouseDown">) {
  return (
    <ToolButton
      label="Add circle"
      onClick={onAddCircle}
      onMouseDown={onMouseDown}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="8" />
      </svg>
    </ToolButton>
  );
}

/** Adds a line item to the canvas. */
export function AddLineButton({
  onAddLine,
  onMouseDown,
}: Pick<AddBasicButtonsProps, "onAddLine" | "onMouseDown">) {
  return (
    <ToolButton label="Add line" onClick={onAddLine} onMouseDown={onMouseDown}>
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 18L20 6" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20" cy="6" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </ToolButton>
  );
}

/** Adds a rectangle item to the canvas. */
export function AddRectangleButton({
  onAddRectangle,
  onMouseDown,
}: Pick<AddBasicButtonsProps, "onAddRectangle" | "onMouseDown">) {
  return (
    <ToolButton
      label="Add rectangle"
      onClick={onAddRectangle}
      onMouseDown={onMouseDown}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="7" width="16" height="10" rx="1.5" />
      </svg>
    </ToolButton>
  );
}

/** Adds a text item to the canvas. */
export function AddTextButton({
  onAddText,
  onMouseDown,
}: Pick<AddBasicButtonsProps, "onAddText" | "onMouseDown">) {
  return (
    <ToolButton
      label="Add text"
      onClick={() => onAddText()}
      onMouseDown={onMouseDown}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 6h14M12 6v12M8 18h8" />
      </svg>
    </ToolButton>
  );
}
