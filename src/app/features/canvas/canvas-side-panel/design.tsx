/** Design.Tsx canvas side panel UI logic. */
import { Path, type FabricObject, type Textbox } from "fabric";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dispatchableSelector, useAppDispatch, useAppSelector } from "../../../store";
import { upsertItemRecord } from "../../../store/editor-slice";
import type { EditorItemRecord } from "../../../store/editor-slice";
import { getVideoWorkAreaRect } from "../../export/video-work-area";
import {
  hasKeyframeNearTime,
  setObjectAnimationPosition,
} from "../../shapes/animatable-object/util";
import { appendUniqueMarkerTimes } from "../util/animations-utils";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import {
  EMPTY_FORM,
  FONT_WEIGHT_OPTIONS,
  CANVAS_KEYFRAME_EPSILON,
  POPULAR_GOOGLE_FONT_FAMILIES,
} from "../../../../const";
import { RadixMenuSelect } from "../../../components/radix-menu-select";
import { MaskSourceControl } from "./mask-source-control";
import {
  applyPathPointMode,
  getPathPointMode,
  type PathPointMode,
} from "../util/fabric-controls";
import type { DesignFormState } from "../../../../types";
import DesignAlignmentControls from "./design-alignment-controls";
import DesignColorField from "./design-color-field";
import { AccordionSection } from "./design-components";
import DesignNumberField from "./design-number-field";
import {
  clamp,
  clampMin,
  formatNumberInput,
  getNumericKeyframeFields,
  getNumericKeyframeValue,
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
  ensureGoogleFontsLoaded,
  fieldClass,
  getPrimaryFontFamilyName,
  labelClass,
  readDesignFormFromObject,
  scheduleGoogleFontsLoad,
} from "./util";

type DesignSectionId = "appearance" | "masking" | "transform" | "typography";

const INITIAL_OPEN_SECTIONS: Record<DesignSectionId, boolean> = {
  appearance: true,
  masking: true,
  transform: true,
  typography: true,
};

const PATH_POINT_MODE_OPTIONS: Array<{ label: string; value: PathPointMode }> = [
  { label: "Sharp", value: "sharp" },
  { label: "Independent", value: "independent" },
  { label: "Mirrored", value: "mirrored" },
];

/** Design form for editing transform, style, text, and mask settings. */
export default function CanvasSidePanelDesign() {
  const dispatch = useAppDispatch();
  const { fabricCanvasRef, getObjectById: getInstanceById } = useCanvasAppContext();
  const [designForm, setDesignForm] = useState<DesignFormState>(EMPTY_FORM);
  const [openSections, setOpenSections] =
    useState<Record<DesignSectionId, boolean>>(INITIAL_OPEN_SECTIONS);
  const [transformTargetObject, setTransformTargetObject] = useState<FabricObject | null>(null);

  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);
  const selectedId = selectedIds[0] ?? null;

  const selectedContext = useMemo(
    () => ({
      id: selectedId,
      instance: selectedId ? getInstanceById(selectedId) : undefined,
    }),
    [getInstanceById, selectedId],
  );
  const isMultiSelected = selectedIds.length > 1;

  const selectedInstance = selectedContext.instance;
  const selectedObject = selectedInstance?.fabricObject;
  const supportsImageBorder = selectedObject?.type === "image";
  const activePathAnchorCommandIndex =
    selectedObject instanceof Path && Number.isInteger(selectedObject.activePathAnchorCommandIndex)
      ? Number(selectedObject.activePathAnchorCommandIndex)
      : null;
  const activePathPointMode =
    selectedObject instanceof Path && activePathAnchorCommandIndex !== null
      ? getPathPointMode(selectedObject, activePathAnchorCommandIndex)
      : null;
  const supportsText = typeof selectedObject?.get("text") === "string";
  const supportsFill = typeof selectedObject?.get("fill") === "string";
  const supportsStroke = typeof selectedObject?.get("stroke") === "string" || supportsImageBorder;
  const supportsBorderRadius = typeof selectedObject?.get("rx") === "number";
  const fontFamilyOptions = useMemo(() => {
    const selectedFontFamily = getPrimaryFontFamilyName(designForm.fontFamily);
    const nextOptions = POPULAR_GOOGLE_FONT_FAMILIES.map((fontFamily) => ({
      label: fontFamily,
      value: fontFamily,
    }));

    if (POPULAR_GOOGLE_FONT_FAMILIES.some((fontFamily) => fontFamily === selectedFontFamily)) {
      return nextOptions;
    }

    return [
      {
        label: selectedFontFamily,
        value: selectedFontFamily,
      },
      ...nextOptions,
    ];
  }, [designForm.fontFamily]);

  useEffect(() => {
    if (isMultiSelected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransformTargetObject(fabricCanvasRef.current?.getActiveObject() ?? null);
      return;
    }
    setTransformTargetObject(selectedContext.instance?.fabricObject ?? null);
  }, [fabricCanvasRef, isMultiSelected, selectedContext.instance]);

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
    return scheduleGoogleFontsLoad();
  }, []);

  useEffect(() => {
    if (!supportsText) return;
    ensureGoogleFontsLoaded([designForm.fontFamily]);
  }, [designForm.fontFamily, supportsText]);

  /** Adds keyframes for the requested properties at the current playhead time. */
  const addKeyframesForFields = useCallback(
    (fields: KeyframeField[], nextForm: DesignFormState) => {
      const currentPlayheadTime = dispatch(
        dispatchableSelector((state) => state.editor.playHeadTime),
      );
      const itemRecords = dispatch(dispatchableSelector((state) => state.editor.itemsRecord));

      // Split the requested field list once so both the multi-select and
      // single-select paths can reuse the same numeric-property decision.
      const numericFieldsToCapture = getNumericKeyframeFields(fields);

      /** Syncs timeline markers back into the item record after keyframe changes. */
      const updateItemMarkers = (id: string, item: EditorItemRecord | null | undefined) => {
        if (!item) return;

        const nextMarkers = appendUniqueMarkerTimes(
          item.keyframe,
          [currentPlayheadTime],
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
        // Multi-select keyframing snapshots each selected object at the
        // current playhead time, but only for numeric properties.
        if (numericFieldsToCapture.length === 0) return;

        selectedIds.forEach((id) => {
          const instance = getInstanceById(id);
          const item = itemRecords[id];
          if (!instance) return;

          const snapshot = instance.getSnapshot();
          numericFieldsToCapture.forEach((field) => {
            instance.addKeyframe({
              property: field,
              value: snapshot[field],
              time: currentPlayheadTime,
              easing: "linear",
            });
          });

          updateItemMarkers(id, item);
        });
        return;
      }

      const selectedItem = selectedContext.id ? itemRecords[selectedContext.id] : null;
      if (!selectedContext.id || !selectedItem || !selectedContext.instance) return;

      const selectedInstance = selectedContext.instance;

      let createdKeyframe = false;

      // Single-object keyframing can mix numeric and color properties, so the
      // two property families are handled separately and then merged into one
      // marker update below.
      numericFieldsToCapture.forEach((field) => {
        const numericValue = getNumericKeyframeValue(selectedInstance.fabricObject, field);
        if (!Number.isFinite(numericValue)) return;
        selectedInstance.addKeyframe({
          property: field,
          value: numericValue,
          time: currentPlayheadTime,
          easing: "linear",
        });
        createdKeyframe = true;
      });

      fields.forEach((field) => {
        if (field === "fill" || field === "stroke") {
          const colorValue = nextForm[field].trim();
          if (!colorValue) return;
          selectedInstance.addColorKeyframe({
            property: field,
            value: colorValue,
            time: currentPlayheadTime,
            easing: "linear",
          });
          createdKeyframe = true;
        }
      });

      if (!createdKeyframe) return;

      updateItemMarkers(selectedContext.id, selectedItem);
    },
    [dispatch, getInstanceById, isMultiSelected, selectedContext, selectedIds],
  );

  const commitDesignForm = useCallback(
    (nextForm: DesignFormState, changedFields: KeyframeField[] = []) => {
      if (!transformTargetObject) return;

      const object = transformTargetObject;
      const shouldApplyAllFields = changedFields.length === 0;
      const shouldApplyField = (field: KeyframeField) =>
        shouldApplyAllFields || changedFields.includes(field);
      const left = toPrecisionNumber(Number(nextForm.left));
      const top = toPrecisionNumber(Number(nextForm.top));
      const width = clampMin(toPrecisionNumber(Number(nextForm.width)), 0);
      const height = clampMin(toPrecisionNumber(Number(nextForm.height)), 0);
      const borderRadius = clampMin(toPrecisionNumber(Number(nextForm.borderRadius)), 0);
      const opacity = clamp(toPrecisionNumber(Number(nextForm.opacity)), 0, 1);
      const angle = toPrecisionNumber(Number(nextForm.angle));
      const strokeWidth = clampMin(toPrecisionNumber(Number(nextForm.strokeWidth)), 0);

      if (shouldApplyField("left") && Number.isFinite(left)) {
        setObjectAnimationPosition(object, "left", left);
      }
      if (shouldApplyField("top") && Number.isFinite(top)) {
        setObjectAnimationPosition(object, "top", top);
      }
      if (shouldApplyField("width") && Number.isFinite(width) && width > 0) {
        const currentWidth = object.getScaledWidth();
        const currentScaleX = object.scaleX ?? 1;
        if (currentWidth > 0) {
          object.set("scaleX", currentScaleX * (width / currentWidth));
        }
      }
      if (shouldApplyField("height") && Number.isFinite(height) && height > 0) {
        const currentHeight = object.getScaledHeight();
        const currentScaleY = object.scaleY ?? 1;
        if (currentHeight > 0) {
          object.set("scaleY", currentScaleY * (height / currentHeight));
        }
      }
      if (
        shouldApplyField("borderRadius") &&
        Number.isFinite(borderRadius) &&
        supportsBorderRadius &&
        !isMultiSelected
      ) {
        object.set({
          rx: borderRadius,
          ry: borderRadius,
        });
      }
      if (shouldApplyField("opacity") && Number.isFinite(opacity) && !isMultiSelected) {
        object.set("opacity", opacity);
      }
      if (shouldApplyField("angle") && Number.isFinite(angle)) {
        object.set("angle", angle);
      }
      if (shouldApplyField("strokeWidth") && Number.isFinite(strokeWidth) && !isMultiSelected) {
        object.set("strokeWidth", strokeWidth);
      }

      if (shouldApplyField("fill") && !isMultiSelected && supportsFill) {
        object.set("fill", nextForm.fill.trim());
      }
      if (shouldApplyField("stroke") && !isMultiSelected && supportsStroke) {
        object.set("stroke", nextForm.stroke.trim());
      }
      if (!isMultiSelected && supportsText) {
        const textObject = object as Textbox;
        const currentScaleX = textObject.scaleX ?? 1;
        const fixedWrapWidth =
          currentScaleX !== 0 ? textObject.getScaledWidth() / currentScaleX : 0;

        if (Number.isFinite(fixedWrapWidth) && fixedWrapWidth > 0) {
          textObject.set("width", fixedWrapWidth);
        }

        textObject.set("text", nextForm.text);
        textObject.set("fontFamily", nextForm.fontFamily.trim());
        const fontSize = toPrecisionNumber(Number(nextForm.fontSize));
        const lineHeight = toPrecisionNumber(Number(nextForm.lineHeight));
        const letterSpacing = toPrecisionNumber(Number(nextForm.letterSpacing));
        if (Number.isFinite(fontSize) && fontSize > 0) {
          textObject.set("fontSize", fontSize);
        }
        if (Number.isFinite(lineHeight) && lineHeight > 0) {
          textObject.set("lineHeight", lineHeight);
        }
        if (Number.isFinite(letterSpacing)) {
          textObject.set("charSpacing", letterSpacing);
        }
        textObject.set("fontStyle", nextForm.fontStyle);
        textObject.set("fontWeight", nextForm.fontWeight);
        textObject.initDimensions();
        ensureGoogleFontsLoaded([nextForm.fontFamily.trim()]);
        void document.fonts?.load(`16px ${nextForm.fontFamily.trim()}`).then(() => {
          textObject.initDimensions();
          textObject.set("dirty", true);
          textObject.canvas?.requestRenderAll();
        });
      }

      // Fabric mutates object geometry as transforms are applied, so the form
      // is refreshed from the resulting object dimensions rather than trusting
      // the original typed input values for width and height.
      object.setCoords();
      object.canvas?.requestRenderAll();
      setDesignForm((prev) => ({
        ...prev,
        left: Number.isFinite(left) ? formatNumberInput(left) : prev.left,
        top: Number.isFinite(top) ? formatNumberInput(top) : prev.top,
        width: formatNumberInput(object.getScaledWidth()),
        height: formatNumberInput(object.getScaledHeight()),
        borderRadius:
          Number.isFinite(borderRadius) && supportsBorderRadius
            ? formatNumberInput(borderRadius)
            : prev.borderRadius,
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
        lineHeight:
          supportsText &&
          Number.isFinite(toPrecisionNumber(Number(nextForm.lineHeight))) &&
          Number(nextForm.lineHeight) > 0
            ? formatNumberInput(toPrecisionNumber(Number(nextForm.lineHeight)))
            : prev.lineHeight,
        letterSpacing:
          supportsText && Number.isFinite(toPrecisionNumber(Number(nextForm.letterSpacing)))
            ? formatNumberInput(toPrecisionNumber(Number(nextForm.letterSpacing)))
            : prev.letterSpacing,
      }));

      if (changedFields.length === 0) return;

      addKeyframesForFields(changedFields, nextForm);
    },
    [
      addKeyframesForFields,
      isMultiSelected,
      supportsFill,
      supportsBorderRadius,
      supportsStroke,
      supportsText,
      transformTargetObject,
    ],
  );

  /** Commits a single numeric field change coming from a child field component. */
  const commitNumericField = useCallback(
    (field: NumericScrubField, value: string, shouldKeyframe: boolean) => {
      // Child field components manage their own transient input state; this
      // callback merges that local draft back into the canonical form snapshot.
      const nextForm = {
        ...designForm,
        [field]: value,
      };

      commitDesignForm(nextForm, shouldKeyframe ? [field] : []);
    },
    [commitDesignForm, designForm],
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

    return Boolean(frames && hasKeyframeNearTime(frames, playheadTime, CANVAS_KEYFRAME_EPSILON));
  };

  const setColorField = (field: ColorFieldKey, value: string, shouldCommit: boolean) => {
    setDesignForm((prev) => {
      const next = { ...prev, [field]: value };
      if (shouldCommit) {
        // Color inputs update freely while typing/picking, then optionally
        // commit once the interaction reaches a stable point.
        commitDesignForm(next, [field]);
      }
      return next;
    });
  };

  /** Toggles one inspector accordion section without affecting the others. */
  const toggleSection = (section: DesignSectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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

    // Alignment works against the selection bounding box so grouped
    // selections and rotated objects move together as one visual unit.
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

    const deltaLeft = nextLeft - currentLeft;
    const deltaTop = nextTop - currentTop;
    if (
      Math.abs(deltaLeft) <= CANVAS_KEYFRAME_EPSILON &&
      Math.abs(deltaTop) <= CANVAS_KEYFRAME_EPSILON
    ) {
      return;
    }

    transformTargetObject.set({
      left: nextLeft,
      top: nextTop,
    });
    transformTargetObject.setCoords();
    transformTargetObject.canvas?.requestRenderAll();

    const currentPlayheadTime = dispatch(
      dispatchableSelector((state) => state.editor.playHeadTime),
    );
    const itemRecords = dispatch(dispatchableSelector((state) => state.editor.itemsRecord));

    /** Syncs marker rows after an alignment operation adds timeline keyframes. */
    const updateItemMarkers = (id: string, item: EditorItemRecord | null | undefined) => {
      if (!item) return;

      const nextMarkers = appendUniqueMarkerTimes(
        item.keyframe,
        [currentPlayheadTime],
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

    const idsToUpdate = isMultiSelected
      ? selectedIds
      : selectedContext.id
        ? [selectedContext.id]
        : [];

    idsToUpdate.forEach((id) => {
      const instance = getInstanceById(id);
      const item = itemRecords[id];
      if (!instance) return;

      const snapshot = instance.getSnapshot();
      if (Math.abs(deltaLeft) > CANVAS_KEYFRAME_EPSILON) {
        instance.addKeyframe({
          property: "left",
          value: snapshot.left,
          time: currentPlayheadTime,
          easing: "linear",
        });
      }
      if (Math.abs(deltaTop) > CANVAS_KEYFRAME_EPSILON) {
        instance.addKeyframe({
          property: "top",
          value: snapshot.top,
          time: currentPlayheadTime,
          easing: "linear",
        });
      }

      updateItemMarkers(id, item);
    });

    setDesignForm(readDesignFormFromObject(transformTargetObject));
  };

  return (
    <>
      {!transformTargetObject ? (
        <p className="text-xs text-[#8f8f8f]">Select an item to edit properties.</p>
      ) : (
        <>
          {selectedObject instanceof Path &&
          selectedObject.isPathEditing &&
          activePathAnchorCommandIndex !== null &&
          activePathPointMode ? (
            <section className="space-y-1.5">
              <div className="font-[var(--wise-font-ui)] text-[11px] font-medium text-[var(--wise-content-secondary)]">
                Point Type
              </div>
              <RadixMenuSelect
                ariaLabel="Select path point type"
                options={PATH_POINT_MODE_OPTIONS}
                triggerClassName="inline-flex h-8 w-full items-center justify-between rounded-[6px] border border-white/10 bg-[var(--wise-surface-raised)] px-2.5 py-1.5 font-[var(--wise-font-ui)] text-[11px] text-white"
                value={activePathPointMode}
                onValueChange={(value) => {
                  if (!(selectedObject instanceof Path) || activePathAnchorCommandIndex === null) {
                    return;
                  }
                  applyPathPointMode(selectedObject, activePathAnchorCommandIndex, value as PathPointMode);
                }}
              />
            </section>
          ) : null}

          <AccordionSection
            title="Transform"
            isOpen={openSections.transform}
            onToggle={() => {
              toggleSection("transform");
            }}
          >
            <div className="space-y-2.5">
              <DesignAlignmentControls onAlign={alignSelectionToVideoArea} />
              {TRANSFORM_FIELD_ROWS.map((row) =>
                row[0].changedField === "left" || row[0].changedField === "width" ? (
                  <div className="space-y-1.5" key={row[0].changedField}>
                    <div className="font-[var(--wise-font-ui)] text-[11px] font-medium text-[var(--wise-content-secondary)]">
                      {row[0].groupLabel}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
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
                          showGroupLabel={false}
                          showPrefix={false}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5" key={row[0].changedField}>
                    {row.map((field) => (
                      <DesignNumberField
                        key={field.changedField}
                        field={field.changedField as NumericScrubField}
                        groupLabel={field.groupLabel}
                        inputClassName={field.inputClassName}
                        inputValue={designForm[field.changedField]}
                        isKeyframed={hasKeyframeAtPlayhead(field.keyframeField)}
                        isSecondaryLabel={false}
                        keyframeLabel={field.keyframeLabel}
                        onAddKeyframe={() => {
                          addPropertyKeyframe(field.keyframeField);
                        }}
                        onCommitValue={commitNumericField}
                        prefix={field.prefix}
                        shapeId={selectedId}
                        showGroupLabel
                        showPrefix={false}
                      />
                    ))}
                  </div>
                ),
              )}
            </div>
          </AccordionSection>
        </>
      )}

      {!isMultiSelected && selectedContext.instance && (supportsFill || supportsStroke) ? (
        <AccordionSection
          title="Appearance"
          isOpen={openSections.appearance}
          onToggle={() => {
            toggleSection("appearance");
          }}
        >
          <div className="space-y-2.5">
            {supportsFill ? (
              <DesignColorField
                inputValue={designForm.fill}
                isKeyframed={hasKeyframeAtPlayhead("fill")}
                label="Fill"
                onAddKeyframe={() => {
                  addPropertyKeyframe("fill");
                }}
                onCommitValue={(value) => {
                  setColorField("fill", value, true);
                }}
                onPreviewValue={(value) => {
                  setColorField("fill", value, false);
                }}
              />
            ) : null}
            {supportsStroke ? (
              <DesignColorField
                fallbackColor="#2c2c2c"
                inputValue={designForm.stroke}
                isKeyframed={hasKeyframeAtPlayhead("stroke")}
                label="Stroke"
                onAddKeyframe={() => {
                  addPropertyKeyframe("stroke");
                }}
                onCommitValue={(value) => {
                  setColorField("stroke", value, true);
                }}
                onPreviewValue={(value) => {
                  setColorField("stroke", value, false);
                }}
              />
            ) : null}
          </div>
          {supportsStroke || supportsBorderRadius ? (
            <div className="grid grid-cols-2 gap-2.5">
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
                  showPrefix={false}
                />
              ) : (
                <div />
              )}
              {supportsBorderRadius ? (
                <DesignNumberField
                  field="borderRadius"
                  groupLabel="Border Radius"
                  inputValue={designForm.borderRadius}
                  isKeyframed={hasKeyframeAtPlayhead("borderRadius")}
                  isSecondaryLabel={!supportsStroke}
                  keyframeLabel="Border Radius"
                  onAddKeyframe={() => {
                    addPropertyKeyframe("borderRadius");
                  }}
                  onCommitValue={commitNumericField}
                  prefix="R"
                  shapeId={selectedId}
                  showPrefix={false}
                />
              ) : (
                <div />
              )}
            </div>
          ) : null}
        </AccordionSection>
      ) : null}

      {!isMultiSelected && selectedContext.instance ? (
        <AccordionSection
          title="Masking"
          isOpen={openSections.masking}
          onToggle={() => {
            toggleSection("masking");
          }}
        >
          <MaskSourceControl
            selectedId={selectedContext.id}
            selectedInstance={selectedContext.instance}
          />
        </AccordionSection>
      ) : null}

      {!isMultiSelected && selectedContext.instance && supportsText ? (
        <AccordionSection
          title="Typography"
          isOpen={openSections.typography}
          onToggle={() => {
            toggleSection("typography");
          }}
        >
          <div className="space-y-2.5">
            <label className={`block ${labelClass}`}>
              <span>Font Family</span>
              <RadixMenuSelect
                ariaLabel="Select font family"
                contentClassName="z-50 max-h-[280px] min-w-[220px] overflow-y-auto rounded-[6px] border border-[rgba(141,171,255,0.14)] bg-[rgba(25,25,28,0.98)] p-1 shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-xl"
                options={fontFamilyOptions}
                triggerClassName={`${fieldClass} inline-flex items-center justify-between gap-2 font-[var(--wise-font-display)] font-semibold`}
                value={getPrimaryFontFamilyName(designForm.fontFamily)}
                onValueChange={(value) => {
                  ensureGoogleFontsLoaded([value]);
                  setDesignForm((prev) => ({
                    ...prev,
                    fontFamily: value,
                  }));
                  commitDesignForm({
                    ...designForm,
                    fontFamily: value,
                  });
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                <span>Text Weight</span>
                <RadixMenuSelect
                  ariaLabel="Select text weight"
                  contentClassName="z-50 min-w-[140px] rounded-[6px] border border-[rgba(141,171,255,0.14)] bg-[rgba(25,25,28,0.98)] p-1 shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-xl"
                  options={FONT_WEIGHT_OPTIONS.map((option) => ({
                    label: option,
                    value: option,
                  }))}
                  triggerClassName={`${fieldClass} inline-flex items-center justify-between gap-2`}
                  value={designForm.fontWeight}
                  onValueChange={(value) => {
                    setDesignForm((prev) => ({
                      ...prev,
                      fontWeight: value,
                    }));
                    commitDesignForm({
                      ...designForm,
                      fontWeight: value,
                    });
                  }}
                />
              </label>

              <DesignNumberField
                field="fontSize"
                groupLabel="Size"
                inputValue={designForm.fontSize}
                isKeyframed={false}
                isSecondaryLabel={false}
                keyframeLabel="Font Size"
                onAddKeyframe={() => {}}
                onCommitValue={commitNumericField}
                prefix="S"
                shapeId={selectedId}
                showPrefix={false}
                showKeyframeAction={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <DesignNumberField
                field="lineHeight"
                groupLabel="Line Height"
                inputValue={designForm.lineHeight}
                isKeyframed={false}
                isSecondaryLabel={false}
                keyframeLabel="Line Height"
                onAddKeyframe={() => {}}
                onCommitValue={commitNumericField}
                prefix="LH"
                shapeId={selectedId}
                showPrefix={false}
                showKeyframeAction={false}
              />

              <DesignNumberField
                field="letterSpacing"
                groupLabel="Letter Spacing"
                inputValue={designForm.letterSpacing}
                isKeyframed={false}
                isSecondaryLabel={false}
                keyframeLabel="Letter Spacing"
                onAddKeyframe={() => {}}
                onCommitValue={commitNumericField}
                prefix="LS"
                shapeId={selectedId}
                showPrefix={false}
                showKeyframeAction={false}
              />
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
        </AccordionSection>
      ) : null}
    </>
  );
}
