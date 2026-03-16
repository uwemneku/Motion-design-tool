/** Add Basic Buttons.Tsx reusable UI component. */
import { Circle, Slash, Square, Type } from "lucide-react";
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
      <Circle className="size-4" strokeWidth={2} aria-hidden />
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
      <Slash className="size-4" strokeWidth={2} aria-hidden />
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
      <Square className="size-4" strokeWidth={2} aria-hidden />
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
      <Type className="size-4" strokeWidth={2} aria-hidden />
    </ToolButton>
  );
}
