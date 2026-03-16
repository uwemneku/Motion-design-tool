/** Add File Buttons.Tsx reusable UI component. */
import { FileImage, ImagePlus } from "lucide-react";
import { useRef, type ChangeEvent, type MouseEvent } from "react";
import { ToolButton } from "./tool-button";

type ButtonMouseDown = (event: MouseEvent<HTMLButtonElement>) => void;

type AddFileButtonsProps = {
  onAddImageFile: (file: File) => void | Promise<void>;
  onAddSvgFile: (file: File) => void | Promise<void>;
  onMouseDown: ButtonMouseDown;
};

/**
 * Tool button that opens an image picker and forwards the selected file.
 */
export function AddImageButton({
  onAddImageFile,
  onMouseDown,
}: Pick<AddFileButtonsProps, "onAddImageFile" | "onMouseDown">) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void onAddImageFile(file);
    event.target.value = "";
  };

  return (
    <>
      <ToolButton
        label="Add image"
        onClick={() => {
          imageInputRef.current?.click();
        }}
        onMouseDown={onMouseDown}
      >
        <ImagePlus className="size-4" strokeWidth={2} aria-hidden />
      </ToolButton>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelected}
        className="hidden"
      />
    </>
  );
}

/**
 * Tool button that opens an SVG picker and forwards the selected file.
 */
export function AddSvgButton({
  onAddSvgFile,
  onMouseDown,
}: Pick<AddFileButtonsProps, "onAddSvgFile" | "onMouseDown">) {
  const svgInputRef = useRef<HTMLInputElement | null>(null);

  const onSvgSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void onAddSvgFile(file);
    event.target.value = "";
  };

  return (
    <>
      <ToolButton
        label="Add SVG"
        onClick={() => {
          svgInputRef.current?.click();
        }}
        onMouseDown={onMouseDown}
      >
        <FileImage className="size-4" strokeWidth={2} aria-hidden />
      </ToolButton>
      <input
        ref={svgInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={onSvgSelected}
        className="hidden"
      />
    </>
  );
}
