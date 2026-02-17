import { useMemo, useState } from "react";
import { Textbox } from "fabric";
import { useDispatch, useSelector } from "react-redux";
import {
  dispatchableSelector,
  type AppDispatch,
  type RootState,
} from "../../store";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../store/editor-slice";
import { TextObject } from "../shapes/objects";
import { useCanvasAppContext } from "./use-canvas-app-context";
import {
  appendUniqueMarkerTimes,
  createCustomId,
  createKeyframeMarkerId,
  getPreviewShapeClass,
  getTextPreviewShapeClass,
  measureCharAdvance,
} from "./animations-utils";
import {
  animationTemplates,
  KEYFRAME_EPSILON,
  textAnimationTemplates,
} from "./canvas-side-panel.const";
import type { PanelTab } from "./canvas-side-panel.types";

export default function CanvasSidePanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById, registerInstance, unregisterInstance } =
    useCanvasAppContext();
  const [activeTab, setActiveTab] = useState<PanelTab>("design");

  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const selectedItem = useSelector((state: RootState) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );

  const canApplyAnimation = Boolean(selectedId && selectedItem);
  const isTextSelected = selectedItem?.name.trim().toLowerCase() === "text";

  const keyframeTimesText = useMemo(() => {
    if (!selectedItem || selectedItem.keyframe.length === 0) return null;
    return selectedItem.keyframe
      .map((frame) => `t=${frame.timestamp.toFixed(2)}s`)
      .join(" • ");
  }, [selectedItem]);

  const applyAnimationTemplate = (
    template: (typeof animationTemplates)[number],
  ) => {
    if (!selectedId || !selectedItem) return;

    const instance = getInstanceById(selectedId);
    if (!instance) return;

    const baseSnapshot = instance.getSnapshot();
    const fromSnapshot = { ...baseSnapshot };
    const toSnapshot = { ...baseSnapshot };

    if (template.id === "fade_in") {
      fromSnapshot.opacity = 0;
      toSnapshot.opacity = Math.max(baseSnapshot.opacity, 1);
    } else if (template.id === "fade_out") {
      toSnapshot.opacity = 0;
    } else if (template.id === "zoom_in") {
      fromSnapshot.scaleX = Math.max(baseSnapshot.scaleX * 0.4, 0.05);
      fromSnapshot.scaleY = Math.max(baseSnapshot.scaleY * 0.4, 0.05);
    } else if (template.id === "zoom_out") {
      toSnapshot.scaleX = Math.max(baseSnapshot.scaleX * 0.4, 0.05);
      toSnapshot.scaleY = Math.max(baseSnapshot.scaleY * 0.4, 0.05);
    }

    const startTime = dispatch(
      dispatchableSelector((state) => state.editor.playheadTime),
    );
    const endTime = startTime + template.duration;
    const keyframeTimes = [startTime, endTime];

    if (template.id === "text_pop_in") {
      const midTime = startTime + template.duration * 0.42;
      const startSnapshot = {
        ...baseSnapshot,
        opacity: 0,
        scaleX: Math.max(baseSnapshot.scaleX * 0.65, 0.05),
        scaleY: Math.max(baseSnapshot.scaleY * 0.65, 0.05),
      };
      const midSnapshot = {
        ...baseSnapshot,
        opacity: 1,
        scaleX: baseSnapshot.scaleX * 1.12,
        scaleY: baseSnapshot.scaleY * 1.12,
      };
      instance.addSnapshotKeyframe(startTime, startSnapshot);
      instance.addSnapshotKeyframe(midTime, midSnapshot);
      instance.addSnapshotKeyframe(endTime, baseSnapshot);
      keyframeTimes.push(midTime);
    } else if (template.id === "text_flicker") {
      const step1 = startTime + template.duration * 0.18;
      const step2 = startTime + template.duration * 0.36;
      const step3 = startTime + template.duration * 0.54;
      const step4 = startTime + template.duration * 0.72;
      instance.addSnapshotKeyframe(startTime, { ...baseSnapshot, opacity: 0.05 });
      instance.addSnapshotKeyframe(step1, { ...baseSnapshot, opacity: 0.9 });
      instance.addSnapshotKeyframe(step2, { ...baseSnapshot, opacity: 0.2 });
      instance.addSnapshotKeyframe(step3, { ...baseSnapshot, opacity: 1 });
      instance.addSnapshotKeyframe(step4, { ...baseSnapshot, opacity: 0.55 });
      instance.addSnapshotKeyframe(endTime, { ...baseSnapshot, opacity: 1 });
      keyframeTimes.push(step1, step2, step3, step4);
    } else if (template.id === "text_wiggle") {
      const step1 = startTime + template.duration * 0.25;
      const step2 = startTime + template.duration * 0.5;
      const step3 = startTime + template.duration * 0.75;
      instance.addSnapshotKeyframe(startTime, { ...baseSnapshot, angle: -6 });
      instance.addSnapshotKeyframe(step1, { ...baseSnapshot, angle: 6 });
      instance.addSnapshotKeyframe(step2, { ...baseSnapshot, angle: -4 });
      instance.addSnapshotKeyframe(step3, { ...baseSnapshot, angle: 4 });
      instance.addSnapshotKeyframe(endTime, { ...baseSnapshot, angle: 0 });
      keyframeTimes.push(step1, step2, step3);
    } else {
      instance.addSnapshotKeyframe(startTime, fromSnapshot);
      instance.addSnapshotKeyframe(endTime, toSnapshot);
    }
    instance.seek(startTime);
    instance.fabricObject.canvas?.requestRenderAll();

    const nextMarkers = appendUniqueMarkerTimes(
      selectedItem.keyframe,
      keyframeTimes,
      KEYFRAME_EPSILON,
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

  const applyTextAnimationTemplate = (
    template: (typeof textAnimationTemplates)[number],
  ) => {
    if (!selectedId || !selectedItem || !isTextSelected) return;

    const instance = getInstanceById(selectedId);
    if (!instance) return;

    const startTime = dispatch(
      dispatchableSelector((state) => state.editor.playheadTime),
    );

    if (template.id === "text_chars_rise") {
      const sourceObject = instance.fabricObject;
      if (!(sourceObject instanceof Textbox)) return;
      const sourceCanvas = sourceObject.canvas;
      if (!sourceCanvas) return;
      const sourceText = sourceObject.text ?? "";
      if (sourceText.length === 0) return;

      const originX = sourceObject.originX ?? "left";
      const originY = sourceObject.originY ?? "top";
      const baseLeft = sourceObject.left ?? 0;
      const baseTop = sourceObject.top ?? 0;
      const baseScaleX = sourceObject.scaleX ?? 1;
      const baseScaleY = sourceObject.scaleY ?? 1;
      const baseAngle = sourceObject.angle ?? 0;
      const baseOpacity = sourceObject.opacity ?? 1;
      const fontSize = sourceObject.fontSize ?? 24;
      const fill = sourceObject.fill;
      const fontFamily = sourceObject.fontFamily;
      const fontWeight = sourceObject.fontWeight;
      const fontStyle = sourceObject.fontStyle;
      const charStagger = 0.06;
      const charDuration = 0.4;
      let cursorX = 0;

      sourceCanvas.remove(sourceObject);
      unregisterInstance(selectedId);
      dispatch(removeItemRecord(selectedId));
      dispatch(setSelectedId(null));

      const createdIds: string[] = [];
      const markerTimesByChar = new Map<string, number[]>();

      for (const character of sourceText.split("")) {
        const advance = measureCharAdvance(character, sourceObject);
        if (character === "\n") continue;
        if (character === " ") {
          cursorX += advance;
          continue;
        }

        const charObject = new TextObject(character, {
          left: baseLeft + cursorX,
          top: baseTop,
          fontSize,
          fill,
          fontFamily,
          fontWeight,
          fontStyle,
          originX,
          originY,
          angle: baseAngle,
          opacity: baseOpacity,
          editable: false,
          strokeUniform: true,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
        });

        const charCustomId = createCustomId("text-char");
        charObject.fabricObject.customId = charCustomId;
        charObject.fabricObject.set("customId", charCustomId);
        registerInstance(charCustomId, charObject);
        sourceCanvas.add(charObject.fabricObject);

        const index = createdIds.length;
        const charStart = startTime + index * charStagger;
        const charEnd = charStart + charDuration;

        charObject.addSnapshotKeyframe(charStart, {
          left: baseLeft + cursorX,
          top: baseTop + 18,
          scaleX: baseScaleX * 0.9,
          scaleY: baseScaleY * 0.9,
          opacity: 0,
          angle: baseAngle,
        });
        charObject.addSnapshotKeyframe(charEnd, {
          left: baseLeft + cursorX,
          top: baseTop,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          opacity: baseOpacity,
          angle: baseAngle,
        });
        charObject.seek(startTime);

        createdIds.push(charCustomId);
        markerTimesByChar.set(charCustomId, [charStart, charEnd]);
        cursorX += advance;
      }

      createdIds.forEach((id, index) => {
        const markers = (markerTimesByChar.get(id) ?? [])
          .map((timestamp) => ({ id: createKeyframeMarkerId(), timestamp }))
          .sort((a, b) => a.timestamp - b.timestamp);

        dispatch(
          upsertItemRecord({
            id,
            value: {
              name: `text-${index + 1}`,
              keyframe: markers,
            },
          }),
        );
      });

      if (createdIds.length > 0) {
        dispatch(setSelectedId(createdIds[0]));
      }
      sourceCanvas.requestRenderAll();
      return;
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-slate-700 bg-slate-900/95">
      <style>
        {`@keyframes preview-fade-in { from { opacity: 0.15; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes preview-fade-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0.15; transform: translateY(-8px) scale(0.92); } }
          @keyframes preview-zoom-in { from { transform: scale(0.45); opacity: 0.35; } to { transform: scale(1); opacity: 1; } }
          @keyframes preview-zoom-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.45); opacity: 0.35; } }
          @keyframes preview-text-pop { 0% { transform: scale(0.6); opacity: 0; } 55% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes preview-text-flicker { 0% { opacity: 0.05; } 20% { opacity: 0.9; } 40% { opacity: 0.2; } 65% { opacity: 1; } 80% { opacity: 0.45; } 100% { opacity: 1; } }
          @keyframes preview-text-wiggle { 0% { transform: rotate(-6deg); } 25% { transform: rotate(6deg); } 50% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } 100% { transform: rotate(0deg); } }
          @keyframes preview-text-char-rise { 0% { opacity: 0; transform: translateY(8px); letter-spacing: -0.08em; } 100% { opacity: 1; transform: translateY(0); letter-spacing: 0; } }`}
      </style>

      <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 p-3">
        <div className="flex rounded-md border border-slate-700 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("design");
            }}
            className={`flex-1 rounded px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              activeTab === "design"
                ? "bg-sky-500/20 text-sky-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("animations");
            }}
            className={`flex-1 rounded px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              activeTab === "animations"
                ? "bg-sky-500/20 text-sky-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Animations
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-4">
          {activeTab === "design" ? (
            <>
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Inspector
                </h3>
                <p className="text-sm text-slate-200">
                  {selectedItem?.name ?? "No item selected"}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedId ? `ID: ${selectedId}` : "Select an item on canvas"}
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Scene
                </h3>
                <p className="text-sm text-slate-200">
                  {canvasItemIds.length} {canvasItemIds.length === 1 ? "item" : "items"}
                </p>
                <p className="text-xs text-slate-500">
                  Keyframes: {selectedItem?.keyframe.length ?? 0}
                </p>
              </section>
            </>
          ) : (
            <section className="flex max-h-full flex-col gap-3 overflow-hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Animation Templates
              </h3>

              {canApplyAnimation ? null : (
                <p className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-500">
                  Select an item in the canvas to apply templates.
                </p>
              )}

              <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 overflow-y-auto pr-1">
                {animationTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={!canApplyAnimation}
                    onClick={() => {
                      applyAnimationTemplate(template);
                    }}
                    className="group rounded-md border border-slate-700 bg-slate-950 p-2 text-left transition hover:border-sky-500/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-200">{template.name}</p>
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                        {template.duration.toFixed(1)}s
                      </span>
                    </div>

                    <div className="mb-2 h-14 rounded border border-slate-800 bg-slate-900/70 p-2">
                      <div
                        className={`h-full w-8 rounded bg-gradient-to-br from-sky-300/90 to-cyan-400/80 ${getPreviewShapeClass(template.id)}`}
                      />
                    </div>

                    <p className="text-xs text-slate-400">{template.description}</p>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Text Effects
                </h4>
                {!isTextSelected ? (
                  <p className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-500">
                    Select a text item to enable special text effects.
                  </p>
                ) : null}
                <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
                  {textAnimationTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      disabled={!isTextSelected}
                      onClick={() => {
                        applyTextAnimationTemplate(template);
                      }}
                      className="group rounded-md border border-slate-700 bg-slate-950 p-2 text-left transition hover:border-cyan-500/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-200">{template.name}</p>
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">
                          {template.duration.toFixed(2)}s
                        </span>
                      </div>
                      <div className="mb-2 h-14 rounded border border-slate-800 bg-slate-900/70 p-2">
                        <div
                          className={`grid h-full place-items-center rounded border border-cyan-300/30 bg-cyan-400/10 text-xs font-bold uppercase tracking-wide text-cyan-200 ${getTextPreviewShapeClass(template.id)}`}
                        >
                          Ab
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {keyframeTimesText ? (
                <p className="text-xs text-slate-500">{keyframeTimesText}</p>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}
