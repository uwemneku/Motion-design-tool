/** Design.Tsx canvas side panel UI logic. */
import type { FabricObject } from "fabric";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { useAppDispatch, useAppSelector } from "../../../store";
import { upsertItemRecord } from "../../../store/editor-slice";
import { getVideoWorkAreaRect } from "../../export/video-work-area";
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
import { FieldShell, KeyframeActionButton } from "./design-components";
import DesignAlignmentControls from "./design-alignment-controls";
import DesignNumberField from "./design-number-field";
import {
  clamp,
  clampMin,
  formatNumberInput,
  getNumericKeyframeFields,
  getNumericKeyframeValue,
  removeNull,
  toPrecisionNumber,
  TRANSFORM_FIELD_ROWS,
} from "./design-helpers";
import type {
  ColorFieldKey,
  HorizontalAlignment,
  KeyframeField,
  NumericScrubField,
  SupportedKeyframeField,
  VerticalAlignment,
} from "./design-helpers";
import {
  cardClass,
  ensureGoogleFontsLoaded,
  fieldClass,
  labelClass,
  normalizeHexColor,
  readDesignFormFromObject,
  sectionTitleClass,
} from "./util";

/** Design form for editing transform, style, text, and mask settings. */
export default function CanvasSidePanelDesign() {
  const dispatch = useAppDispatch();
  const { fabricCanvasRef, getObjectById: getInstanceById } = useCanvasAppContext();
  const [designForm, setDesignForm] = useState<DesignFormState>(EMPTY_FORM);
  const [activeColorField, setActiveColorField] = useState<ColorFieldKey | null>(null);
  const [transformTargetObject, setTransformTargetObject] = useState<FabricObject | null>(null);
  const fillColorSectionRef = useRef<HTMLLabelElement>(null);
  const strokeColorSectionRef = useRef<HTMLLabelElement>(null);
  const designFormRef = useRef(designForm);

  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const selectedId = selectedIds[0] ?? null;
  const selectedItem = useAppSelector((state) => state.editor.itemsRecord?.[selectedId] ?? null);
  const selectedItems = useAppSelector((state) =>
    selectedIds
      .map((id) => ({
        id,
        item: state.editor.itemsRecord?.[id] ?? null,
      }))
      .filter(removeNull),
  );
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);

  const prevSelectedId = useRef<string>(null);

  const selectedInstance = useMemo(
    () => (selectedId ? getInstanceById(selectedId) : undefined),
    [getInstanceById, selectedId],
  );
  const isMultiSelected = selectedIds.length > 1;

  const selectedObject = selectedInstance?.fabricObject;
  const supportsText = typeof selectedObject?.get("text") === "string";
  const supportsFill = typeof selectedObject?.get("fill") === "string";
  const supportsStroke = typeof selectedObject?.get("stroke") === "string";

  useEffect(() => {
    designFormRef.current = designForm;
  }, [designForm]);

  useEffect(() => {
    if (prevSelectedId.current === selectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveColorField(null);
    prevSelectedId.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (isMultiSelected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransformTargetObject(fabricCanvasRef.current?.getActiveObject() ?? null);
      return;
    }
    setTransformTargetObject(selectedInstance?.fabricObject ?? null);
  }, [fabricCanvasRef, isMultiSelected, selectedInstance]);

  useEffect(() => {
    if (!transformTargetObject) return;

    const object = transformTargetObject;
    const syncFromCanvas = () => {
      setDesignForm(readDesignFormFromObject(object));
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
  }, [transformTargetObject]);

  useEffect(() => {
    ensureGoogleFontsLoaded();
  }, []);

  useEffect(() => {
    // Close any open color picker when clicking outside the color editor sections.
    if (!activeColorField) return;

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const isInFillSection = Boolean(fillColorSectionRef.current?.contains(target));
      const isInStrokeSection = Boolean(strokeColorSectionRef.current?.contains(target));
      if (!isInFillSection && !isInStrokeSection) {
        setActiveColorField(null);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, [activeColorField]);

  /** Adds keyframes for the requested properties at the current playhead time. */
  const addKeyframesForFields = useCallback(
    (fields: KeyframeField[], nextForm: DesignFormState) => {
      const numericFieldsToCapture = getNumericKeyframeFields(fields);

      /** Syncs timeline markers back into the item record after keyframe changes. */
      const updateItemMarkers = (id: string, item: typeof selectedItem) => {
        if (!item) return;

        const nextMarkers = appendUniqueMarkerTimes(
          item.keyframe,
          [playheadTime],
          CANVAS_KEYFRAME_EPSILON,
        );

        dispatch(
          upsertItemRecord({
            id,
            value: {
              ...item,
              keyframe: nextMarkers,
            },
          }),
        );
      };

      if (isMultiSelected) {
        if (numericFieldsToCapture.length === 0) return;

        selectedItems.forEach(({ id, item }) => {
          const instance = getInstanceById(id);
          if (!instance) return;

          const snapshot = instance.getSnapshot();
          numericFieldsToCapture.forEach((field) => {
            instance.addKeyframe({
              property: field,
              value: snapshot[field],
              time: playheadTime,
              easing: "linear",
            });
          });

          updateItemMarkers(id, item);
        });
        return;
      }

      if (!selectedId || !selectedItem || !selectedInstance) return;

      let addedKeyframe = false;

      numericFieldsToCapture.forEach((field) => {
        const numericValue = getNumericKeyframeValue(selectedInstance.fabricObject, field);
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

      updateItemMarkers(selectedId, selectedItem);
    },
    [
      dispatch,
      getInstanceById,
      isMultiSelected,
      playheadTime,
      selectedId,
      selectedInstance,
      selectedItem,
      selectedItems,
    ],
  );

  const commitDesignForm = useCallback(
    (nextForm: DesignFormState, changedFields: KeyframeField[] = []) => {
      if (!transformTargetObject) return;

      const object = transformTargetObject;
      const left = toPrecisionNumber(Number(nextForm.left));
      const top = toPrecisionNumber(Number(nextForm.top));
      const width = clampMin(toPrecisionNumber(Number(nextForm.width)), 0);
      const height = clampMin(toPrecisionNumber(Number(nextForm.height)), 0);
      const opacity = clamp(toPrecisionNumber(Number(nextForm.opacity)), 0, 1);
      const angle = toPrecisionNumber(Number(nextForm.angle));
      const strokeWidth = clampMin(toPrecisionNumber(Number(nextForm.strokeWidth)), 0);

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
      if (Number.isFinite(opacity) && !isMultiSelected) object.set("opacity", opacity);
      if (Number.isFinite(angle)) object.set("angle", angle);
      if (Number.isFinite(strokeWidth) && !isMultiSelected) {
        object.set("strokeWidth", strokeWidth);
      }

      if (!isMultiSelected && supportsFill) object.set("fill", nextForm.fill.trim());
      if (!isMultiSelected && supportsStroke) {
        object.set("stroke", nextForm.stroke.trim());
      }
      if (!isMultiSelected && supportsText) {
        object.set("text", nextForm.text);
        object.set("fontFamily", nextForm.fontFamily.trim());
        const fontSize = toPrecisionNumber(Number(nextForm.fontSize));
        if (Number.isFinite(fontSize) && fontSize > 0) {
          object.set("fontSize", fontSize);
        }
        object.set("fontStyle", nextForm.fontStyle);
        object.set("fontWeight", nextForm.fontWeight);
        void document.fonts?.load(`16px ${nextForm.fontFamily.trim()}`).then(() => {
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
        opacity: Number.isFinite(opacity) ? formatNumberInput(opacity) : prev.opacity,
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
    },
    [
      addKeyframesForFields,
      isMultiSelected,
      supportsFill,
      supportsStroke,
      supportsText,
      transformTargetObject,
    ],
  );

  /** Commits a single numeric field change coming from a child field component. */
  const commitNumericField = useCallback(
    (field: NumericScrubField, value: string, shouldKeyframe: boolean) => {
      const nextForm = {
        ...designFormRef.current,
        [field]: value,
      };

      designFormRef.current = nextForm;
      commitDesignForm(nextForm, shouldKeyframe ? [field] : []);
    },
    [commitDesignForm],
  );

  /** Commits the current field value and adds a keyframe for that property. */
  const addPropertyKeyframe = (field: SupportedKeyframeField) => {
    commitDesignForm(designForm);
    addKeyframesForFields([field], designForm);
  };

  /** Reports whether the selected item already has a keyframe for a field now. */
  const hasKeyframeAtPlayhead = (field: SupportedKeyframeField) => {
    if (!selectedInstance || isMultiSelected) return false;

    const frames =
      field === "fill" || field === "stroke"
        ? selectedInstance.colorKeyframes[field]
        : selectedInstance.keyframes[field];

    return Boolean(
      frames?.some((frame) => Math.abs(frame.time - playheadTime) <= CANVAS_KEYFRAME_EPSILON),
    );
  };

  const setColorField = (field: ColorFieldKey, value: string, shouldCommit: boolean) => {
    setDesignForm((prev) => {
      const next = { ...prev, [field]: value };
      if (shouldCommit) {
        commitDesignForm(next, [field]);
      }
      return next;
    });
  };

  /** Aligns the active selection to the video area along a requested axis. */
  const alignSelectionToVideoArea = (
    axis: HorizontalAlignment | VerticalAlignment,
    activeAspectRatio: number,
  ) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !transformTargetObject) return;

    const videoArea = getVideoWorkAreaRect(
      canvas.getWidth(),
      canvas.getHeight(),
      activeAspectRatio,
    );
    const bounds = transformTargetObject.getBoundingRect();
    const currentLeft = transformTargetObject.left ?? 0;
    const currentTop = transformTargetObject.top ?? 0;
    const boundsCenterX = bounds.left + bounds.width / 2;
    const boundsCenterY = bounds.top + bounds.height / 2;

    let nextLeft = currentLeft;
    let nextTop = currentTop;

    if (axis === "left") {
      nextLeft += videoArea.left - bounds.left;
    } else if (axis === "center") {
      nextLeft += videoArea.left + videoArea.width / 2 - boundsCenterX;
    } else if (axis === "right") {
      nextLeft += videoArea.left + videoArea.width - (bounds.left + bounds.width);
    } else if (axis === "top") {
      nextTop += videoArea.top - bounds.top;
    } else if (axis === "middle") {
      nextTop += videoArea.top + videoArea.height / 2 - boundsCenterY;
    } else if (axis === "bottom") {
      nextTop += videoArea.top + videoArea.height - (bounds.top + bounds.height);
    }

    transformTargetObject.set({
      left: nextLeft,
      top: nextTop,
    });
    transformTargetObject.setCoords();
    transformTargetObject.canvas?.requestRenderAll();
    setDesignForm(readDesignFormFromObject(transformTargetObject));
  };

  return (
    <>
      <section className={cardClass}>
        {!transformTargetObject ? (
          <p className="text-xs text-[#8f8f8f]">Select an item to edit properties.</p>
        ) : (
          <>
            <h4 className={sectionTitleClass}>Transform</h4>
            <DesignAlignmentControls onAlign={alignSelectionToVideoArea} />
            {TRANSFORM_FIELD_ROWS.map((row) => (
              <div className="grid grid-cols-2 gap-2.5" key={row[0].changedField}>
                {row.map((field, index) => (
                  <DesignNumberField
                    key={field.changedField}
                    field={field.changedField as NumericScrubField}
                    groupLabel={field.groupLabel}
                    inputClassName={field.inputClassName}
                    inputValue={designForm[field.changedField]}
                    isKeyframed={hasKeyframeAtPlayhead(field.keyframeField)}
                    isSecondaryLabel={index > 0}
                    keyframeLabel={field.keyframeLabel}
                    onAddKeyframe={() => {
                      addPropertyKeyframe(field.keyframeField);
                    }}
                    onCommitValue={commitNumericField}
                    prefix={field.prefix}
                    shapeId={selectedId}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </section>

      {!isMultiSelected && selectedInstance && (supportsFill || supportsStroke) ? (
        <section className={cardClass}>
          <h4 className={sectionTitleClass}>Appearance</h4>
          {supportsFill ? (
            <label ref={fillColorSectionRef} className={`block ${labelClass}`}>
              <span className="text-[#d5d8e1]">Fill</span>
              <div className="space-y-2">
                <FieldShell className="gap-2 px-2">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("fill")}
                    label="Fill"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("fill");
                    }}
                    className="right-9"
                  />
                  <HexColorInput
                    color={normalizeHexColor(designForm.fill)}
                    alpha
                    prefixed
                    onFocus={() => {
                      setActiveColorField("fill");
                    }}
                    onChange={(value) => {
                      setColorField("fill", `#${value.replace(/^#/, "")}`, false);
                    }}
                    onBlur={() => {
                      setColorField("fill", normalizeHexColor(designForm.fill), true);
                    }}
                    className="h-full flex-1 bg-transparent pr-10 text-[13px] text-[#f6f7fb] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveColorField("fill");
                    }}
                    className="h-6 w-6 shrink-0 rounded-[7px] border border-white/12"
                    style={{
                      backgroundColor: normalizeHexColor(designForm.fill),
                    }}
                  />
                </FieldShell>
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
            <label ref={strokeColorSectionRef} className={`block ${labelClass}`}>
              <span className="text-[#d5d8e1]">Stroke</span>
              <div className="space-y-2">
                <FieldShell className="gap-2 px-2">
                  <KeyframeActionButton
                    isKeyframed={hasKeyframeAtPlayhead("stroke")}
                    label="Stroke"
                    onAddKeyframe={() => {
                      addPropertyKeyframe("stroke");
                    }}
                    className="right-9"
                  />
                  <HexColorInput
                    color={normalizeHexColor(designForm.stroke, "#2c2c2c")}
                    alpha
                    prefixed
                    onFocus={() => {
                      setActiveColorField("stroke");
                    }}
                    onChange={(value) => {
                      setColorField("stroke", `#${value.replace(/^#/, "")}`, false);
                    }}
                    onBlur={() => {
                      setColorField(
                        "stroke",
                        normalizeHexColor(designForm.stroke, "#2c2c2c"),
                        true,
                      );
                    }}
                    className="h-full flex-1 bg-transparent pr-10 text-[13px] text-[#f6f7fb] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveColorField("stroke");
                    }}
                    className="h-6 w-6 shrink-0 rounded-[7px] border border-white/12"
                    style={{
                      backgroundColor: normalizeHexColor(designForm.stroke, "#2c2c2c"),
                    }}
                  />
                </FieldShell>
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
            <DesignNumberField
              field="strokeWidth"
              groupLabel="Border Width"
              inputValue={designForm.strokeWidth}
              isKeyframed={hasKeyframeAtPlayhead("strokeWidth")}
              isSecondaryLabel={false}
              keyframeLabel="Border Width"
              onAddKeyframe={() => {
                addPropertyKeyframe("strokeWidth");
              }}
              onCommitValue={commitNumericField}
              prefix="W"
              shapeId={selectedId}
            />
          ) : null}
        </section>
      ) : null}

      {!isMultiSelected && selectedInstance ? (
        <section className={cardClass}>
          <h4 className={sectionTitleClass}>Masking</h4>
          <MaskSourceControl selectedId={selectedId} selectedInstance={selectedInstance} />
        </section>
      ) : null}

      {!isMultiSelected && selectedInstance && supportsText ? (
        <section className={cardClass}>
          <h4 className={sectionTitleClass}>Typography</h4>
          <div className="space-y-2.5">
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

            <div className="grid grid-cols-3 gap-2.5">
              <label className={labelClass}>
                <span>Font Size</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={designForm.fontSize}
                  onChange={(event) => {
                    if (!/^-?\d*\.?\d*$/.test(event.target.value)) return;
                    setDesignForm((prev) => ({
                      ...prev,
                      fontSize: event.target.value,
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
                className="w-full resize-y rounded-[10px] border border-transparent bg-[rgba(255,255,255,0.055)] px-3 py-2.5 text-[13px] text-[#efefef] outline-none transition focus:border-white/15 focus:bg-[rgba(255,255,255,0.075)]"
              />
            </label>
          </div>
        </section>
      ) : null}
    </>
  );
}
