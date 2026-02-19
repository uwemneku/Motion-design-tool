/** Keyframe Details.Tsx canvas side panel UI logic. */
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../store';
import { setSelectedKeyframe } from '../../../store/editor-slice';
import { EASING_OPTIONS } from '../../../../const';
import type {
  ColorKeyframe,
  KeyframeEasing,
  Keyframe,
} from '../../shapes/animatable-object/types';
import { useCanvasAppContext } from '../hooks/use-canvas-app-context';

type DetailRow = {
  label: string;
  value: string;
};

/** Shows selected item keyframe details in the side panel footer area. */
export function KeyframeDetailsPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById } = useCanvasAppContext();
  const [revision, setRevision] = useState(0);
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const selectedKeyframe = useSelector(
    (state: RootState) => state.editor.selectedKeyframe,
  );
  const selectedItem = useSelector((state: RootState) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );
  const selectedKeyframeTime =
    selectedId && selectedKeyframe?.itemId === selectedId
      ? selectedKeyframe.timestamp
      : null;
  const selectedKeyframeId =
    selectedId && selectedKeyframe?.itemId === selectedId
      ? selectedKeyframe.keyframeId
      : null;
  const selectedProperty =
    selectedId && selectedKeyframe?.itemId === selectedId
      ? selectedKeyframe.property
      : null;

  const detailRows = useMemo(() => {
    if (!selectedId) return [];
    const instance = getInstanceById(selectedId);
    if (!instance) return [];

    return [
      toNumericRow('Position X', instance.keyframes.left),
      toNumericRow('Position Y', instance.keyframes.top),
      toNumericRow('Scale X', instance.keyframes.scaleX),
      toNumericRow('Scale Y', instance.keyframes.scaleY),
      toNumericRow('Opacity', instance.keyframes.opacity),
      toNumericRow('Rotation', instance.keyframes.angle),
      toColorRow('Fill', instance.colorKeyframes.fill),
      toColorRow('Stroke', instance.colorKeyframes.stroke),
    ].filter((row): row is DetailRow => Boolean(row));
  }, [getInstanceById, selectedId, selectedItem?.keyframe, revision]);

  const selectedEasing = useMemo(() => {
    if (!selectedId || !selectedKeyframeId) return null;
    const instance = getInstanceById(selectedId);
    if (!instance) return null;
    return getEasingById(instance, selectedKeyframeId);
  }, [getInstanceById, revision, selectedId, selectedKeyframeId]);

  return (
    <section className="space-y-2 border-t border-[var(--wise-border)] pt-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Keyframe Details
      </h4>

      {!selectedId ? (
        <p
          className={
            'rounded border border-[var(--wise-border)] ' +
            'bg-[var(--wise-surface)] px-2 py-1.5 text-xs text-slate-500'
          }
        >
          Select an item to inspect keyframes.
        </p>
      ) : (
        <>
          {selectedKeyframeTime !== null ? (
            <div
              className={
                'space-y-2 rounded border border-[var(--wise-border)] ' +
                'bg-[var(--wise-surface)] px-2 py-2'
              }
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Transition
                </p>
                <button
                  type="button"
                  className={
                    'rounded border border-[var(--wise-border)] ' +
                    'bg-[var(--wise-surface-muted)] px-2 py-1 text-[10px] ' +
                    'text-slate-300'
                  }
                  onClick={() => {
                    dispatch(setSelectedKeyframe(null));
                  }}
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-slate-300">
                {`Time ${selectedKeyframeTime.toFixed(2)}s`}
              </p>
              <p className="text-xs text-slate-400">
                {`Property: ${selectedProperty ?? 'unknown'}`}
              </p>
              <label
                className={
                  'flex flex-col gap-1 text-[10px] uppercase tracking-wide ' +
                  'text-slate-400'
                }
              >
                Easing
                <select
                  className={
                    'rounded border border-[var(--wise-border)] ' +
                    'bg-[var(--wise-surface)] px-2 py-1 text-xs ' +
                    'text-slate-100 outline-none'
                  }
                  value={selectedEasing ?? 'linear'}
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
                    setRevision((prev) => prev + 1);
                  }}
                >
                  {EASING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p
              className={
                'rounded border border-[var(--wise-border)] ' +
                'bg-[var(--wise-surface)] px-2 py-1.5 text-xs text-slate-500'
              }
            >
              Click a keyframe to edit transition.
            </p>
          )}

          {detailRows.length === 0 ? (
            <p
              className={
                'rounded border border-[var(--wise-border)] ' +
                'bg-[var(--wise-surface)] px-2 py-1.5 text-xs text-slate-500'
              }
            >
              No keyframe details available.
            </p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {detailRows.map((row) => (
                <div
                  key={row.label}
                  className={
                    'rounded border border-[var(--wise-border)] ' +
                    'bg-[var(--wise-surface)] px-2 py-1.5'
                  }
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-200">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function toNumericRow(
  label: string,
  frames: Array<Keyframe> | undefined,
): DetailRow | null {
  if (!frames || frames.length === 0) return null;
  const value = [...frames]
    .sort((a, b) => a.time - b.time)
    .map((frame) => `${formatTime(frame.time)}: ${formatNumber(frame.value)} (${frame.easing})`)
    .join(' • ');
  return { label, value };
}

function toColorRow(
  label: string,
  frames: Array<ColorKeyframe> | undefined,
): DetailRow | null {
  if (!frames || frames.length === 0) return null;
  const value = [...frames]
    .sort((a, b) => a.time - b.time)
    .map((frame) => `${formatTime(frame.time)}: ${frame.value} (${frame.easing})`)
    .join(' • ');
  return { label, value };
}

function formatTime(time: number) {
  return `${time.toFixed(2)}s`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '-';
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

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
    if (!frames) continue;
    const match = frames.find((frame) => frame.id === keyframeId);
    if (match) return match.easing;
  }

  for (const frames of Object.values(instance.colorKeyframes)) {
    if (!frames) continue;
    const match = frames.find((frame) => frame.id === keyframeId);
    if (match) return match.easing;
  }

  return null;
}
