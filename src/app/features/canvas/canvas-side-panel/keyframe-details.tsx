/** Keyframe Details.Tsx canvas side panel UI logic. */
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { RadixMenuSelect } from "../../../components/radix-menu-select";
import { setSelectedKeyframes } from "../../../store/editor-slice";
import { EASING_OPTIONS } from "../../../../const";
import type { KeyframeEasing } from "../../shapes/animatable-object/types";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

/** Shows only the selected keyframe transition control in the inspector footer. */
export function KeyframeDetailsPanel() {
  const dispatch = useAppDispatch();
  const { getObjectById: getInstanceById } = useCanvasAppContext();
  const [, forceRefresh] = useState(0);
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const selectedKeyframes = useAppSelector((state) => state.editor.selectedKeyframes);
  const selectedId = selectedIds[0] ?? null;
  const singleSelectedKeyframe = selectedKeyframes.length === 1 ? selectedKeyframes[0] : null;

  const selectedKeyframeId =
    selectedId && singleSelectedKeyframe?.itemId === selectedId
      ? singleSelectedKeyframe.keyframeId
      : null;

  const selectedEasing = (() => {
    if (!selectedId || !selectedKeyframeId) return null;
    const instance = getInstanceById(selectedId);
    if (!instance) return null;
    return getEasingById(instance, selectedKeyframeId);
  })();

  return (
    <section className="shrink-0 border-t border-white/10 bg-[rgba(35,35,37,0.98)] px-2.5 py-2 backdrop-blur-xl">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c6cad2]">
            Transition
          </p>
          {selectedKeyframeId ? (
            <button
              type="button"
              className="text-[10px] font-medium text-[#a7afbb] transition hover:text-[#f3f5f8]"
              onClick={() => {
                dispatch(setSelectedKeyframes([]));
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {selectedKeyframeId ? (
          <RadixMenuSelect
            ariaLabel="Select keyframe transition"
            contentClassName="z-50 min-w-[160px] rounded-[6px] border border-[rgba(141,171,255,0.14)] bg-[rgba(25,25,28,0.98)] p-1 shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-xl"
            options={EASING_OPTIONS.map((option) => ({
              label: formatEasingLabel(option),
              value: option,
            }))}
            triggerClassName="inline-flex h-8 w-full items-center justify-between gap-2 rounded-[4px] border border-[rgba(141,171,255,0.14)] bg-[var(--wise-surface-raised)] px-2.5 font-[var(--wise-font-ui)] text-[11px] text-[#f3f5f8] outline-none transition hover:bg-white/6"
            value={selectedEasing ?? "linear"}
            onValueChange={(value) => {
              if (!selectedId || !selectedKeyframeId) return;
              const instance = getInstanceById(selectedId);
              if (!instance) return;
              applyEasingById(instance, selectedKeyframeId, value as KeyframeEasing);
              instance.fabricObject.canvas?.requestRenderAll();
              forceRefresh((prev) => prev + 1);
            }}
          />
        ) : (
          <p className="text-[11px] text-[#8f97a4]">
            {selectedKeyframes.length > 1
              ? "Select a single keyframe to edit its transition type."
              : "Select a keyframe to edit its transition type."}
          </p>
        )}
      </div>
    </section>
  );
}

function formatEasingLabel(easing: KeyframeEasing) {
  if (easing === "easeIn") return "Ease In";
  if (easing === "easeOut") return "Ease Out";
  if (easing === "easeInOut") return "Ease In Out";
  if (easing === "naturalness") return "Naturalness";
  return easing.charAt(0).toUpperCase() + easing.slice(1);
}

/** Updates a keyframe easing value across numeric and color keyframe collections. */
function applyEasingById(
  instance: {
    keyframes: Partial<Record<string, Array<{ id: string; easing: KeyframeEasing }>>>;
    colorKeyframes: Partial<Record<string, Array<{ id: string; easing: KeyframeEasing }>>>;
    pathKeyframes: Partial<Record<string, Array<{ id: string; easing: KeyframeEasing }>>>;
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

  Object.values(instance.pathKeyframes).forEach((frames) => {
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
    keyframes: Partial<Record<string, Array<{ id: string; easing: KeyframeEasing }>>>;
    colorKeyframes: Partial<Record<string, Array<{ id: string; easing: KeyframeEasing }>>>;
    pathKeyframes: Partial<Record<string, Array<{ id: string; easing: KeyframeEasing }>>>;
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

  for (const frames of Object.values(instance.pathKeyframes)) {
    const match = frames?.find((frame) => frame.id === keyframeId);
    if (match) return match.easing;
  }

  return null;
}
