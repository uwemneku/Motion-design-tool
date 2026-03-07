/** Keyframe Details.Tsx canvas side panel UI logic. */
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setSelectedKeyframe } from "../../../store/editor-slice";
import { EASING_OPTIONS } from "../../../../const";
import type { KeyframeEasing } from "../../shapes/animatable-object/types";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

/** Shows only the selected keyframe transition control in the inspector footer. */
export function KeyframeDetailsPanel() {
  const dispatch = useAppDispatch();
  const { getObjectById: getInstanceById } = useCanvasAppContext();
  const [, forceRefresh] = useState(0);
  const selectedId = useAppSelector((state) => state.editor.selectedId);
  const selectedKeyframe = useAppSelector((state) => state.editor.selectedKeyframe);

  const selectedKeyframeId =
    selectedId && selectedKeyframe?.itemId === selectedId
      ? selectedKeyframe.keyframeId
      : null;

  const selectedEasing = (() => {
    if (!selectedId || !selectedKeyframeId) return null;
    const instance = getInstanceById(selectedId);
    if (!instance) return null;
    return getEasingById(instance, selectedKeyframeId);
  })();

  return (
    <section className="shrink-0 border-t border-white/10 bg-[rgba(12,15,22,0.82)] px-2.5 py-2 backdrop-blur-xl">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bfc7d4]">
            Transition
          </p>
          {selectedKeyframeId ? (
            <button
              type="button"
              className="text-[10px] font-medium text-[#8fa6c7] transition hover:text-[#dce7f7]"
              onClick={() => {
                dispatch(setSelectedKeyframe(null));
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {selectedKeyframeId ? (
          <select
            className="h-8 w-full rounded-[10px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-2.5 text-[11px] text-[#eef4ff] outline-none transition focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]/45"
            value={selectedEasing ?? "linear"}
            onChange={(event) => {
              if (!selectedId || !selectedKeyframeId) return;
              const instance = getInstanceById(selectedId);
              if (!instance) return;
              applyEasingById(
                instance,
                selectedKeyframeId,
                event.target.value as KeyframeEasing,
              );
              instance.fabricObject.canvas?.requestRenderAll();
              forceRefresh((prev) => prev + 1);
            }}
          >
            {EASING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[11px] text-[#8d97a8]">
            Select a keyframe to edit its transition type.
          </p>
        )}
      </div>
    </section>
  );
}

/** Updates a keyframe easing value across numeric and color keyframe collections. */
function applyEasingById(
  instance: {
    keyframes: Partial<
      Record<string, Array<{ id: string; easing: KeyframeEasing }>>
    >;
    colorKeyframes: Partial<
      Record<string, Array<{ id: string; easing: KeyframeEasing }>>
    >;
  },
  keyframeId: string,
  easing: KeyframeEasing,
) {
  Object.values(instance.keyframes).forEach((frames) => {
    if (!frames) return;
    frames.forEach((frame) => {
      if (frame.id === keyframeId) {
        frame.easing = easing;
      }
    });
  });

  Object.values(instance.colorKeyframes).forEach((frames) => {
    if (!frames) return;
    frames.forEach((frame) => {
      if (frame.id === keyframeId) {
        frame.easing = easing;
      }
    });
  });
}

/** Finds the easing value for a selected keyframe id. */
function getEasingById(
  instance: {
    keyframes: Partial<
      Record<string, Array<{ id: string; easing: KeyframeEasing }>>
    >;
    colorKeyframes: Partial<
      Record<string, Array<{ id: string; easing: KeyframeEasing }>>
    >;
  },
  keyframeId: string,
) {
  for (const frames of Object.values(instance.keyframes)) {
    const match = frames?.find((frame) => frame.id === keyframeId);
    if (match) return match.easing;
  }

  for (const frames of Object.values(instance.colorKeyframes)) {
    const match = frames?.find((frame) => frame.id === keyframeId);
    if (match) return match.easing;
  }

  return null;
}
