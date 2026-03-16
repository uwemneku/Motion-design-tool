/** Animations.Tsx canvas side panel UI logic. */
import { Textbox } from "fabric";
import {
  dispatchableSelector,
  useAppDispatch,
  useAppSelector,
} from "../../../store";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../../store/editor-slice";
import { TextObject } from "../../shapes/objects";
import {
  appendUniqueMarkerTimes,
  createUniqueId,
  createKeyframeMarkerId,
  measureCharAdvance,
  getPreviewShapeClass,
  getTextPreviewShapeClass,
} from "../util/animations-utils";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { CANVAS_KEYFRAME_EPSILON } from "../../../../const";
import { animationTemplates, textAnimationTemplates } from "./util";

type CanvasSidePanelAnimationsProps = {
  canApplyAnimation: boolean;
  keyframeTimesText: string | null;
};

/** Animation template browser and applier for the selected canvas item. */
export default function CanvasSidePanelAnimations({
  canApplyAnimation,
  keyframeTimesText,
}: CanvasSidePanelAnimationsProps) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const selectedId = selectedIds[0] ?? null;
  const selectedItem = useAppSelector((state) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );
  const isTextSelected = selectedItem?.name.trim().toLowerCase() === "text";
  const {
    getObjectById: getInstanceById,
    addCanvasObject: registerInstance,
    deleteCanvasObject: unregisterInstance,
  } = useCanvasAppContext();

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
    }

    const startTime = dispatch(
      dispatchableSelector((state) => state.editor.playHeadTime),
    );
    const endTime = startTime + template.duration;
    const keyframeTimes = [startTime, endTime];

    if (template.id === "text_flicker") {
      const step1 = startTime + template.duration * 0.18;
      const step2 = startTime + template.duration * 0.36;
      const step3 = startTime + template.duration * 0.54;
      const step4 = startTime + template.duration * 0.72;
      instance.addSnapshotKeyframe(startTime, {
        ...baseSnapshot,
        opacity: 0.05,
      });
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

  const applyTextAnimationTemplate = (
    template: (typeof textAnimationTemplates)[number],
  ) => {
    if (!selectedId || !selectedItem || !isTextSelected) return;

    const instance = getInstanceById(selectedId);
    if (!instance) return;

    const startTime = dispatch(
      dispatchableSelector((state) => state.editor.playHeadTime),
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
      dispatch(setSelectedId([]));

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
        });

        const charCustomId = createUniqueId("text-char");
        charObject.fabricObject.customId = charCustomId;
        charObject.fabricObject.set("customId", charCustomId);
        registerInstance(charCustomId, charObject);
        sourceCanvas.add(charObject.fabricObject);

        const index = createdIds.length;
        const charStart = startTime + index * charStagger;
        const charEnd = charStart + charDuration;
        const charSnapshot = charObject.getSnapshot();

        charObject.addSnapshotKeyframe(charStart, {
          left: baseLeft + cursorX,
          top: baseTop + 18,
          opacity: 0,
          angle: baseAngle,
          width: charSnapshot.width,
          height: charSnapshot.height,
          borderRadius: charSnapshot.borderRadius,
          strokeWidth: charSnapshot.strokeWidth,
        });
        charObject.addSnapshotKeyframe(charEnd, {
          left: baseLeft + cursorX,
          top: baseTop,
          opacity: baseOpacity,
          angle: baseAngle,
          width: charSnapshot.width,
          height: charSnapshot.height,
          borderRadius: charSnapshot.borderRadius,
          strokeWidth: charSnapshot.strokeWidth,
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
        dispatch(setSelectedId([createdIds[0]]));
      }
      sourceCanvas.requestRenderAll();
    }
  };

  return (
    <section className="flex max-h-full flex-col gap-3 overflow-hidden">
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

      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cfd3db]">
        Animation Templates
      </h3>

      {canApplyAnimation ? null : (
        <p className="rounded-[8px] border border-white/10 bg-[rgba(255,255,255,0.045)] px-2.5 py-2 text-xs text-[#9da5b2]">
          Select an item in the canvas to apply templates.
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {animationTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={!canApplyAnimation}
            onClick={() => {
              applyAnimationTemplate(template);
            }}
            className="group flex min-h-[116px] flex-col rounded-[12px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-2.5 text-left transition hover:border-white/16 hover:bg-[rgba(255,255,255,0.045)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-[11px] leading-4 text-[#edf0f5]">
                {template.name}
              </p>
              <span className="text-[10px] uppercase tracking-wide text-[#7e8794]">
                {template.duration.toFixed(1)}s
              </span>
            </div>

            <div
              className={`h-14 w-full rounded-[10px] bg-gradient-to-br from-[#cfd5df] to-[#7f8998] ${getPreviewShapeClass(template.id)}`}
            />
          </button>
        ))}
      </div>

      <div className="pt-1">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cfd3db]">
          Text Effects
        </h4>
        {!isTextSelected ? (
          <p className="rounded-[8px] border border-white/10 bg-[rgba(255,255,255,0.045)] px-2.5 py-2 text-xs text-[#9da5b2]">
            Select a text item to enable special text effects.
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {textAnimationTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={!isTextSelected}
              onClick={() => {
                applyTextAnimationTemplate(template);
              }}
              className="group rounded-[12px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-2.5 text-left transition hover:border-white/16 hover:bg-[rgba(255,255,255,0.045)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold leading-4 text-[#edf0f5]">
                  {template.name}
                </p>
                <span className="text-[10px] uppercase tracking-wide text-[#7e8794]">
                  {template.duration.toFixed(2)}s
                </span>
              </div>
              <div className="mb-2 h-12 rounded-[10px] border border-white/8 bg-[rgba(18,18,20,0.7)] p-2">
                <div
                  className={`h-full bg-(--wise-raised) ${getTextPreviewShapeClass(template.id)}`}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {keyframeTimesText ? (
        <p className="text-xs text-[#7e8794]">{keyframeTimesText}</p>
      ) : null}
    </section>
  );
}
