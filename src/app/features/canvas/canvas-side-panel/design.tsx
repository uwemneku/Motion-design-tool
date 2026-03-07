/** Design.Tsx canvas side panel UI logic. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { useAppDispatch, useAppSelector } from "../../../store";
import { upsertItemRecord } from "../../../store/editor-slice";
import { appendUniqueMarkerTimes } from "../util/animations-utils";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import {
  EMPTY_FORM,
  FONT_FAMILY_PRESETS,
  FONT_STYLE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  CANVAS_KEYFRAME_EPSILON,
} from "../../../../const";
import { MaskSourceControl } from "./mask-source-control";
import type { DesignFormState } from "../../../../types";
import {
  cardClass,
  ensureGoogleFontsLoaded,
  fieldClass,
  labelClass,
  normalizeHexColor,
  readDesignForm,
  sectionTitleClass,
} from "./util";

type ColorFieldKey = "fill" | "stroke";
type KeyframeField = keyof Omit<DesignFormState, "text">;
type SupportedKeyframeField =
  | "left"
  | "top"
  | "width"
  | "height"
  | "opacity"
  | "angle"
  | "fill"
  | "stroke";
const INPUT_PRECISION = 3;

/** Design form for editing transform, style, text, and mask settings. */
export default function CanvasSidePanelDesign() {
  const dispatch = useAppDispatch();
  const { getObjectById: getInstanceById } = useCanvasAppContext();
  const [designForm, setDesignForm] = useState<DesignFormState>(EMPTY_FORM);
  const [activeColorField, setActiveColorField] =
    useState<ColorFieldKey | null>(null);
  const fillColorSectionRef = useRef<HTMLLabelElement>(null);
  const strokeColorSectionRef = useRef<HTMLLabelElement>(null);

  const selectedId = useAppSelector((state) => state.editor.selectedId);
  const selectedItem = useAppSelector((state) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);

  const prevSelectedId = useRef<string>(null);

  const selectedInstance = useMemo(
    () => (selectedId ? getInstanceById(selectedId) : undefined),
    [getInstanceById, selectedId],
  );

  const selectedObject = selectedInstance?.fabricObject;
  const supportsText = typeof selectedObject?.get("text") === "string";
  const supportsFill = typeof selectedObject?.get("fill") === "string";
  const supportsStroke = typeof selectedObject?.get("stroke") === "string";

  // eslint-disable-next-line react-hooks/refs
  if (prevSelectedId.current !== selectedId) {
    setActiveColorField(null);
    // eslint-disable-next-line react-hooks/refs
    prevSelectedId.current = selectedId;
  }

  useEffect(() => {
    if (!selectedInstance) return;

    const object = selectedInstance.fabricObject;
    const syncFromCanvas = () => {
      setDesignForm(readDesignForm(selectedInstance));
    };

    syncFromCanvas();
    object.on("moving", syncFromCanvas);
    object.on("scaling", syncFromCanvas);
    object.on("rotating", syncFromCanvas);
    object.on("skewing", syncFromCanvas);
    object.on("modified", syncFromCanvas);
    object.on("my:custom:seek", syncFromCanvas);

    return () => {
      object.off("moving", syncFromCanvas);
      object.off("scaling", syncFromCanvas);
      object.off("rotating", syncFromCanvas);
      object.off("skewing", syncFromCanvas);
      object.off("modified", syncFromCanvas);
      object.off("my:custom:seek", syncFromCanvas);
    };
  }, [selectedInstance]);

  useEffect(() => {
    ensureGoogleFontsLoaded();
  }, []);

  useEffect(() => {
    // Close any open color picker when clicking outside the color editor sections.
    if (!activeColorField) return;

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const isInFillSection = Boolean(
        fillColorSectionRef.current?.contains(target),
      );
      const isInStrokeSection = Boolean(
        strokeColorSectionRef.current?.contains(target),
      );
      if (!isInFillSection && !isInStrokeSection) {
        setActiveColorField(null);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, [activeColorField]);

  const commitDesignForm = (
    nextForm: DesignFormState,
    changedFields: KeyframeField[] = [],
  ) => {
    if (!selectedId || !selectedItem || !selectedInstance) return;

    const object = selectedInstance.fabricObject;
    const left = toPrecisionNumber(Number(nextForm.left));
    const top = toPrecisionNumber(Number(nextForm.top));
    const width = clampMin(toPrecisionNumber(Number(nextForm.width)), 0);
    const height = clampMin(toPrecisionNumber(Number(nextForm.height)), 0);
    const opacity = clamp(toPrecisionNumber(Number(nextForm.opacity)), 0, 1);
    const angle = toPrecisionNumber(Number(nextForm.angle));
    const strokeWidth = clampMin(
      toPrecisionNumber(Number(nextForm.strokeWidth)),
      0,
    );

    if (Number.isFinite(left)) object.set("left", left);
    if (Number.isFinite(top)) object.set("top", top);
    if (Number.isFinite(width) && width > 0) {
      const currentWidth = object.getScaledWidth();
      const currentScaleX = object.scaleX ?? 1;
      if (currentWidth > 0) {
        object.set("scaleX", currentScaleX * (width / currentWidth));
      }
    }
    if (Number.isFinite(height) && height > 0) {
      const currentHeight = object.getScaledHeight();
      const currentScaleY = object.scaleY ?? 1;
      if (currentHeight > 0) {
        object.set("scaleY", currentScaleY * (height / currentHeight));
      }
    }
    if (Number.isFinite(opacity)) object.set("opacity", opacity);
    if (Number.isFinite(angle)) object.set("angle", angle);
    if (Number.isFinite(strokeWidth)) object.set("strokeWidth", strokeWidth);

    if (supportsFill) object.set("fill", nextForm.fill.trim());
    if (supportsStroke) object.set("stroke", nextForm.stroke.trim());
    if (supportsText) {
      object.set("text", nextForm.text);
      object.set("fontFamily", nextForm.fontFamily.trim());
      const fontSize = toPrecisionNumber(Number(nextForm.fontSize));
      if (Number.isFinite(fontSize) && fontSize > 0) {
        object.set("fontSize", fontSize);
      }
      object.set("fontStyle", nextForm.fontStyle);
      object.set("fontWeight", nextForm.fontWeight);
      void document.fonts
        ?.load(`16px ${nextForm.fontFamily.trim()}`)
        .then(() => {
          object.set("dirty", true);
          object.canvas?.requestRenderAll();
        });
    }

    object.setCoords();
    object.canvas?.requestRenderAll();
    setDesignForm((prev) => ({
      ...prev,
      left: Number.isFinite(left) ? formatNumberInput(left) : prev.left,
      top: Number.isFinite(top) ? formatNumberInput(top) : prev.top,
      width: formatNumberInput(object.getScaledWidth()),
      height: formatNumberInput(object.getScaledHeight()),
      opacity: Number.isFinite(opacity)
        ? formatNumberInput(opacity)
        : prev.opacity,
      angle: Number.isFinite(angle) ? formatNumberInput(angle) : prev.angle,
      strokeWidth: Number.isFinite(strokeWidth)
        ? formatNumberInput(strokeWidth)
        : prev.strokeWidth,
      fontSize:
        supportsText &&
        Number.isFinite(toPrecisionNumber(Number(nextForm.fontSize))) &&
        Number(nextForm.fontSize) > 0
          ? formatNumberInput(toPrecisionNumber(Number(nextForm.fontSize)))
          : prev.fontSize,
    }));

    if (changedFields.length === 0) return;

    addKeyframesForFields(changedFields, nextForm);
  };

  /** Adds keyframes for the requested properties at the current playhead time. */
  const addKeyframesForFields = (fields: KeyframeField[], nextForm: DesignFormState) => {
    if (!selectedId || !selectedItem || !selectedInstance) return;

    let addedKeyframe = false;

    const numericFieldsToCapture = new Set<
      "left" | "top" | "width" | "height" | "opacity" | "angle"
    >();
    fields.forEach((field) => {
      if (
        field === "left" ||
        field === "top" ||
        field === "width" ||
        field === "height" ||
        field === "opacity" ||
        field === "angle"
      ) {
        numericFieldsToCapture.add(field);
      }
    });

    numericFieldsToCapture.forEach((field) => {
      const numericValue =
        field === "width"
          ? selectedInstance.fabricObject.getScaledWidth()
          : field === "height"
            ? selectedInstance.fabricObject.getScaledHeight()
            : Number(selectedInstance.fabricObject.get(field));
      if (!Number.isFinite(numericValue)) return;
      selectedInstance.addKeyframe({
        property: field,
        value: numericValue,
        time: playheadTime,
        easing: "linear",
      });
      addedKeyframe = true;
    });

    fields.forEach((field) => {
      if (field === "fill" || field === "stroke") {
        const colorValue = nextForm[field].trim();
        if (!colorValue) return;
        selectedInstance.addColorKeyframe({
          property: field,
          value: colorValue,
          time: playheadTime,
          easing: "linear",
        });
        addedKeyframe = true;
      }
    });

    if (!addedKeyframe) return;

    const nextMarkers = appendUniqueMarkerTimes(
      selectedItem.keyframe,
      [playheadTime],
      CANVAS_KEYFRAME_EPSILON,
    );

    dispatch(
      upsertItemRecord({
        id: selectedId,
        value: {
          ...selectedItem,
          keyframe: nextMarkers,
        },
      }),
    );
  };

  /** Commits the current field value and adds a keyframe for that property. */
  const addPropertyKeyframe = (field: SupportedKeyframeField) => {
    commitDesignForm(designForm);
    addKeyframesForFields([field], designForm);
  };

  /** Reports whether the selected item already has a keyframe for a field now. */
  const hasKeyframeAtPlayhead = (field: SupportedKeyframeField) => {
    if (!selectedInstance) return false;

    const frames =
      field === "fill" || field === "stroke"
        ? selectedInstance.colorKeyframes[field]
        : selectedInstance.keyframes[field];

    return Boolean(
      frames?.some(
        (frame) =>
          Math.abs(frame.time - playheadTime) <= CANVAS_KEYFRAME_EPSILON,
      ),
    );
  };

  const setColorField = (
    field: ColorFieldKey,
    value: string,
    shouldCommit: boolean,
  ) => {
    setDesignForm((prev) => {
      const next = { ...prev, [field]: value };
      if (shouldCommit) {
        commitDesignForm(next, [field]);
      }
      return next;
    });
  };

  const onInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    changedFields: KeyframeField[] = [],
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitDesignForm(designForm, changedFields);
  };

  return (
    <>
      <section className={cardClass}>
        {!selectedInstance ? (
          <p className="text-xs text-[#8f8f8f]">
            Select an item to edit properties.
          </p>
        ) : (
          <>
            <h4 className={sectionTitleClass}>Transform</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                <span className="text-[#d5d8e1]">Position X</span>
                <div className="relative">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("left")}
                    label="Position X"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("left");
                    }}
                  />
                  <input
                    type="number"
                    step={0.001}
                    value={designForm.left}
                    onChange={(event) => {
                      setDesignForm((prev) => ({
                        ...prev,
                        left: event.target.value,
                      }));
                    }}
                    onBlur={() => commitDesignForm(designForm, ["left"])}
                    onKeyDown={(event) => onInputKeyDown(event, ["left"])}
                    className={`${fieldClass} pr-9`}
                  />
                </div>
              </label>
              <label className={labelClass}>
                <span className="text-[#d5d8e1]">Position Y</span>
                <div className="relative">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("top")}
                    label="Position Y"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("top");
                    }}
                  />
                  <input
                    type="number"
                    step={0.001}
                    value={designForm.top}
                    onChange={(event) => {
                      setDesignForm((prev) => ({
                        ...prev,
                        top: event.target.value,
                      }));
                    }}
                    onBlur={() => commitDesignForm(designForm, ["top"])}
                    onKeyDown={(event) => onInputKeyDown(event, ["top"])}
                    className={`${fieldClass} pr-9`}
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                <span className="text-[#d5d8e1]">Width</span>
                <div className="relative">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("width")}
                    label="Width"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("width");
                    }}
                  />
                  <input
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={designForm.width}
                    onChange={(event) => {
                      setDesignForm((prev) => ({
                        ...prev,
                        width: event.target.value,
                      }));
                    }}
                    onBlur={() => commitDesignForm(designForm, ["width"])}
                    onKeyDown={(event) => onInputKeyDown(event, ["width"])}
                    className={`${fieldClass} pr-9`}
                  />
                </div>
              </label>
              <label className={labelClass}>
                <span className="text-[#d5d8e1]">Height</span>
                <div className="relative">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("height")}
                    label="Height"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("height");
                    }}
                  />
                  <input
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={designForm.height}
                    onChange={(event) => {
                      setDesignForm((prev) => ({
                        ...prev,
                        height: event.target.value,
                      }));
                    }}
                    onBlur={() => commitDesignForm(designForm, ["height"])}
                    onKeyDown={(event) => onInputKeyDown(event, ["height"])}
                    className={`${fieldClass} pr-9`}
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                <span className="text-[#d5d8e1]">Opacity</span>
                <div className="relative">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("opacity")}
                    label="Opacity"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("opacity");
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.001}
                    value={designForm.opacity}
                    onChange={(event) => {
                      setDesignForm((prev) => ({
                        ...prev,
                        opacity: event.target.value,
                      }));
                    }}
                    onBlur={() => commitDesignForm(designForm, ["opacity"])}
                    onKeyDown={(event) => onInputKeyDown(event, ["opacity"])}
                    className={`${fieldClass} pr-9`}
                  />
                </div>
              </label>
              <label className={labelClass}>
                <span className="text-[#d5d8e1]">Rotation</span>
                <div className="relative">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("angle")}
                    label="Rotation"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("angle");
                    }}
                  />
                  <input
                    type="number"
                    step={0.001}
                    value={designForm.angle}
                    onChange={(event) => {
                      setDesignForm((prev) => ({
                        ...prev,
                        angle: event.target.value,
                      }));
                    }}
                    onBlur={() => commitDesignForm(designForm, ["angle"])}
                    onKeyDown={(event) => onInputKeyDown(event, ["angle"])}
                    className={`${fieldClass} pr-9`}
                  />
                </div>
              </label>
            </div>
          </>
        )}
      </section>

      {selectedInstance && (supportsFill || supportsStroke) ? (
        <section className={cardClass}>
          <h4 className={sectionTitleClass}>Fill</h4>
          {supportsFill ? (
            <label ref={fillColorSectionRef} className={`block ${labelClass}`}>
              <span className="text-[#d5d8e1]">Fill</span>
              <div className="space-y-2 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-muted)] p-2">
                <div className="relative flex items-center gap-2">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("fill")}
                    label="Fill"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("fill");
                    }}
                    className="right-8"
                  />
                  <HexColorInput
                    color={normalizeHexColor(designForm.fill)}
                    alpha
                    prefixed
                    onFocus={() => {
                      setActiveColorField("fill");
                    }}
                    onChange={(value) => {
                      setColorField(
                        "fill",
                        `#${value.replace(/^#/, "")}`,
                        false,
                      );
                    }}
                    onBlur={() => {
                      setColorField(
                        "fill",
                        normalizeHexColor(designForm.fill),
                        true,
                      );
                    }}
                    className={`${fieldClass} flex-1 pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveColorField("fill");
                    }}
                    className="h-5 w-5 shrink-0 rounded border border-[var(--wise-border)]"
                    style={{
                      backgroundColor: normalizeHexColor(designForm.fill),
                    }}
                  />
                </div>
                {activeColorField === "fill" ? (
                  <HexAlphaColorPicker
                    color={normalizeHexColor(designForm.fill)}
                    onChange={(value) => {
                      setColorField("fill", value, true);
                    }}
                    className="!w-full"
                  />
                ) : null}
              </div>
            </label>
          ) : null}

          {supportsStroke ? (
            <label
              ref={strokeColorSectionRef}
              className={`block ${labelClass}`}
            >
              <span className="text-[#d5d8e1]">Stroke</span>
              <div className="space-y-2 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-muted)] p-2">
                <div className="relative flex items-center gap-2">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("stroke")}
                    label="Stroke"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("stroke");
                    }}
                    className="right-8"
                  />
                  <HexColorInput
                    color={normalizeHexColor(designForm.stroke, "#2c2c2c")}
                    alpha
                    prefixed
                    onFocus={() => {
                      setActiveColorField("stroke");
                    }}
                    onChange={(value) => {
                      setColorField(
                        "stroke",
                        `#${value.replace(/^#/, "")}`,
                        false,
                      );
                    }}
                    onBlur={() => {
                      setColorField(
                        "stroke",
                        normalizeHexColor(designForm.stroke, "#2c2c2c"),
                        true,
                      );
                    }}
                    className={`${fieldClass} flex-1 pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveColorField("stroke");
                    }}
                    className="h-5 w-5 shrink-0 rounded border border-[var(--wise-border)]"
                    style={{
                      backgroundColor: normalizeHexColor(
                        designForm.stroke,
                        "#2c2c2c",
                      ),
                    }}
                  />
                </div>
                {activeColorField === "stroke" ? (
                  <HexAlphaColorPicker
                    color={normalizeHexColor(designForm.stroke, "#2c2c2c")}
                    onChange={(value) => {
                      setColorField("stroke", value, true);
                    }}
                    className="!w-full"
                  />
                ) : null}
              </div>
            </label>
          ) : null}
          {supportsStroke ? (
            <label className={labelClass}>
              <span>Width</span>
              <input
                type="number"
                min={0}
                step={0.001}
                value={designForm.strokeWidth}
                onChange={(event) => {
                  setDesignForm((prev) => ({
                    ...prev,
                    strokeWidth: event.target.value,
                  }));
                }}
                onBlur={() => commitDesignForm(designForm, ["strokeWidth"])}
                onKeyDown={(event) => onInputKeyDown(event, ["strokeWidth"])}
                className={fieldClass}
              />
            </label>
          ) : null}
        </section>
      ) : null}

      {selectedInstance ? (
        <section className={cardClass}>
          <h4 className={sectionTitleClass}>Masking</h4>
          <MaskSourceControl
            selectedId={selectedId}
            selectedInstance={selectedInstance}
          />
        </section>
      ) : null}

      {selectedInstance && supportsText ? (
        <section className={cardClass}>
          <h4 className={sectionTitleClass}>Fonts</h4>
          <div className="space-y-2">
            <label className={`block ${labelClass}`}>
              <span>Font Family</span>
              <input
                type="text"
                list="text-font-family-presets"
                value={designForm.fontFamily}
                placeholder="Type or choose a font"
                autoComplete="off"
                onChange={(event) => {
                  setDesignForm((prev) => ({
                    ...prev,
                    fontFamily: event.target.value,
                  }));
                }}
                onBlur={() => commitDesignForm(designForm)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  commitDesignForm(designForm);
                }}
                className={fieldClass}
              />
              <datalist id="text-font-family-presets">
                {FONT_FAMILY_PRESETS.map((fontFamily) => (
                  <option key={fontFamily} value={fontFamily} />
                ))}
              </datalist>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className={labelClass}>
                <span>Font Size</span>
                <input
                  type="number"
                  min={1}
                  step={0.001}
                  value={designForm.fontSize}
                  onChange={(event) => {
                    setDesignForm((prev) => ({
                      ...prev,
                      fontSize: event.target.value,
                    }));
                  }}
                  onBlur={() => commitDesignForm(designForm)}
                  onKeyDown={(event) => onInputKeyDown(event)}
                  className={fieldClass}
                />
              </label>

              <label className={labelClass}>
                <span>Style</span>
                <select
                  value={designForm.fontStyle}
                  onChange={(event) => {
                    setDesignForm((prev) => ({
                      ...prev,
                      fontStyle: event.target.value,
                    }));
                  }}
                  onBlur={() => commitDesignForm(designForm)}
                  className={fieldClass}
                >
                  {FONT_STYLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                <span>Weight</span>
                <select
                  value={designForm.fontWeight}
                  onChange={(event) => {
                    setDesignForm((prev) => ({
                      ...prev,
                      fontWeight: event.target.value,
                    }));
                  }}
                  onBlur={() => commitDesignForm(designForm)}
                  className={fieldClass}
                >
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={`block ${labelClass}`}>
              <span>Text</span>
              <textarea
                value={designForm.text}
                onChange={(event) => {
                  setDesignForm((prev) => ({
                    ...prev,
                    text: event.target.value,
                  }));
                }}
                onBlur={() => commitDesignForm(designForm)}
                rows={3}
                className="w-full resize-y rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1.5 text-[11px] text-[#efefef] outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]/45"
              />
            </label>
          </div>
        </section>
      ) : null}
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampMin(value: number, min: number) {
  return Math.max(min, value);
}

function toPrecisionNumber(value: number) {
  if (!Number.isFinite(value)) return Number.NaN;
  return Number(value.toFixed(INPUT_PRECISION));
}

function formatNumberInput(value: number) {
  return Number(value.toFixed(INPUT_PRECISION)).toString();
}

type KeyframeActionButtonProps = {
  className?: string;
  isKeyframed: boolean;
  label: string;
  onAddKeyframe: () => void;
};

/** Renders a compact add-keyframe action inside a property field. */
function KeyframeActionButton({
  className,
  isKeyframed,
  label,
  onAddKeyframe,
}: KeyframeActionButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onAddKeyframe();
      }}
      className={`absolute right-2 top-1/2 inline-flex size-4 -translate-y-1/2 items-center justify-center rounded-md border transition ${
        isKeyframed
          ? "border-[#2563eb] bg-[#2563eb]/18 text-[#93c5fd]"
          : "border-white/10 bg-[rgba(255,255,255,0.03)] text-[#8f96a3] hover:border-[#2563eb]/70 hover:bg-[#2563eb]/10 hover:text-[#93c5fd]"
      } ${className ?? ""}`}
      aria-label={`Add keyframe for ${label}`}
      title={`Add keyframe for ${label}`}
    >
      <svg viewBox="0 0 24 24" className="size-3" fill="currentColor">
        <path d="M12 4l8 8-8 8-8-8 8-8z" />
      </svg>
    </button>
  );
}
