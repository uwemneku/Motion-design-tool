import { useEffect, useMemo, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { useDispatch, useSelector } from 'react-redux';
import {
  dispatchableSelector,
  type AppDispatch,
  type RootState,
} from '../../../store';
import { upsertItemRecord } from '../../../store/editor-slice';
import type { AnimatableObject } from '../../shapes/animatable-object/object';
import { appendUniqueMarkerTimes } from '../animations-utils';
import { useCanvasAppContext } from '../use-canvas-app-context';
import { KEYFRAME_EPSILON } from './const';

type DesignFormState = {
  left: string;
  top: string;
  scaleX: string;
  scaleY: string;
  opacity: string;
  angle: string;
  fill: string;
  stroke: string;
  text: string;
};

type ColorFieldKey = 'fill' | 'stroke';
type KeyframeField = keyof Omit<DesignFormState, 'text'>;

type MaskFormState = {
  sourceId: string;
};

const EMPTY_FORM: DesignFormState = {
  left: '0',
  top: '0',
  scaleX: '1',
  scaleY: '1',
  opacity: '1',
  angle: '0',
  fill: '',
  stroke: '',
  text: '',
};
const NONE_MASK_SOURCE_ID = 'none';
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const sectionTitleClass =
  'text-[11px] font-semibold uppercase tracking-wide text-[#b8b8b8]';
const labelClass = 'space-y-1 text-[11px] text-[#b1b1b1]';
const fieldClass =
  'h-7 w-full rounded-md border border-[var(--wise-border)] ' +
  'bg-[var(--wise-surface)] px-2 text-[11px] text-[#efefef] ' +
  'outline-none focus:border-[#0d99ff] focus:ring-1 focus:ring-[#0d99ff]/45';
const cardClass =
  'space-y-2 rounded-md border border-[var(--wise-border)] ' +
  'bg-[var(--wise-surface)] p-2.5';
const MASK_SYNC_EVENTS = [
  'moving',
  'scaling',
  'rotating',
  'skewing',
  'modified',
  'changed',
] as const;

export default function CanvasSidePanelDesign() {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById } = useCanvasAppContext();
  const [designForm, setDesignForm] = useState<DesignFormState>(EMPTY_FORM);
  const [maskForm, setMaskForm] = useState<MaskFormState>({
    sourceId: NONE_MASK_SOURCE_ID,
  });
  const [activeColorField, setActiveColorField] =
    useState<ColorFieldKey | null>(null);

  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const itemsRecord = useSelector((state: RootState) => state.editor.itemsRecord);
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const selectedItem = useSelector((state: RootState) =>
    selectedId ? state.editor.itemsRecord[selectedId] : null,
  );

  const selectedInstance = useMemo(
    () => (selectedId ? getInstanceById(selectedId) : undefined),
    [getInstanceById, selectedId],
  );

  const maskCandidates = useMemo(() => {
    return canvasItemIds
      .filter((id) => id !== selectedId)
      .map((id) => ({
        id,
        name: itemsRecord[id]?.name ?? id,
      }));
  }, [canvasItemIds, itemsRecord, selectedId]);

  const selectedObject = selectedInstance?.fabricObject;
  const supportsText = typeof selectedObject?.get('text') === 'string';
  const supportsFill = typeof selectedObject?.get('fill') === 'string';
  const supportsStroke = typeof selectedObject?.get('stroke') === 'string';

  useEffect(() => {
    setDesignForm(readDesignForm(selectedInstance));
  }, [selectedId, selectedInstance]);

  useEffect(() => {
    setActiveColorField(null);
  }, [selectedId]);

  useEffect(() => {
    setMaskForm({
      sourceId: readMaskSourceId(selectedInstance),
    });
  }, [selectedId, selectedInstance]);

  useEffect(() => {
    if (!selectedInstance) return;

    const object = selectedInstance.fabricObject;
    const syncFromCanvas = () => {
      setDesignForm(readDesignForm(selectedInstance));
    };

    syncFromCanvas();
    object.on('moving', syncFromCanvas);
    object.on('scaling', syncFromCanvas);
    object.on('rotating', syncFromCanvas);
    object.on('skewing', syncFromCanvas);
    object.on('modified', syncFromCanvas);
    object.on('changed', syncFromCanvas);

    return () => {
      object.off('moving', syncFromCanvas);
      object.off('scaling', syncFromCanvas);
      object.off('rotating', syncFromCanvas);
      object.off('skewing', syncFromCanvas);
      object.off('modified', syncFromCanvas);
      object.off('changed', syncFromCanvas);
    };
  }, [selectedInstance]);

  const commitDesignForm = (
    nextForm: DesignFormState,
    changedFields: KeyframeField[] = [],
  ) => {
    if (!selectedId || !selectedItem || !selectedInstance) return;

    const object = selectedInstance.fabricObject;
    const left = Number(nextForm.left);
    const top = Number(nextForm.top);
    const scaleX = Number(nextForm.scaleX);
    const scaleY = Number(nextForm.scaleY);
    const opacity = Number(nextForm.opacity);
    const angle = Number(nextForm.angle);

    if (Number.isFinite(left)) object.set('left', left);
    if (Number.isFinite(top)) object.set('top', top);
    if (Number.isFinite(scaleX)) object.set('scaleX', scaleX);
    if (Number.isFinite(scaleY)) object.set('scaleY', scaleY);
    if (Number.isFinite(opacity)) {
      object.set('opacity', Math.min(1, Math.max(0, opacity)));
    }
    if (Number.isFinite(angle)) object.set('angle', angle);

    if (supportsFill) object.set('fill', nextForm.fill.trim());
    if (supportsStroke) object.set('stroke', nextForm.stroke.trim());
    if (supportsText) object.set('text', nextForm.text);

    object.setCoords();
    object.canvas?.requestRenderAll();

    if (changedFields.length === 0) return;

    const playheadTime = dispatch(
      dispatchableSelector((state) => state.editor.playheadTime),
    );
    let addedKeyframe = false;

    changedFields.forEach((field) => {
      if (
        field === 'left' ||
        field === 'top' ||
        field === 'scaleX' ||
        field === 'scaleY' ||
        field === 'opacity' ||
        field === 'angle'
      ) {
        const numericValue = Number(nextForm[field]);
        if (!Number.isFinite(numericValue)) return;
        selectedInstance.addKeyframe({
          property: field,
          value: numericValue,
          time: playheadTime,
          easing: 'linear',
        });
        addedKeyframe = true;
      }

      if (field === 'fill' || field === 'stroke') {
        const colorValue = nextForm[field].trim();
        if (!colorValue) return;
        selectedInstance.addColorKeyframe({
          property: field,
          value: colorValue,
          time: playheadTime,
          easing: 'linear',
        });
        addedKeyframe = true;
      }
    });

    if (!addedKeyframe) return;

    const nextMarkers = appendUniqueMarkerTimes(
      selectedItem.keyframe,
      [playheadTime],
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

  const commitMaskForm = (nextMaskForm: MaskFormState) => {
    if (!selectedInstance) return;
    if (nextMaskForm.sourceId === NONE_MASK_SOURCE_ID) {
      clearMaskFromObject(selectedInstance);
      return;
    }

    const sourceInstance = getInstanceById(nextMaskForm.sourceId);
    if (!sourceInstance || sourceInstance === selectedInstance) return;

    applyMaskFromCanvasObject(selectedInstance, sourceInstance);
  };

  return (
    <>
      <section className='space-y-1'>
        <h3 className={sectionTitleClass}>Inspector</h3>
        <p className='text-sm text-[#e6e6e6]'>
          {selectedItem?.name ?? 'No item selected'}
        </p>
        <p className='text-xs text-[#8f8f8f]'>
          {selectedId ? `ID: ${selectedId}` : 'Select an item on canvas'}
        </p>
      </section>

      <section className={cardClass}>
        <h4 className={sectionTitleClass}>Transform</h4>

        {!selectedInstance ? (
          <p className='text-xs text-[#8f8f8f]'>
            Select an item to edit properties.
          </p>
        ) : (
          <>
            <div className='grid grid-cols-2 gap-2'>
              <label className={labelClass}>
                <span>Position X</span>
                <input
                  type='number'
                  value={designForm.left}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, left: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm, ['left'])}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                <span>Position Y</span>
                <input
                  type='number'
                  value={designForm.top}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, top: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm, ['top'])}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <label className={labelClass}>
                <span>Scale X</span>
                <input
                  type='number'
                  step={0.01}
                  value={designForm.scaleX}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, scaleX: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm, ['scaleX'])}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                <span>Scale Y</span>
                <input
                  type='number'
                  step={0.01}
                  value={designForm.scaleY}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, scaleY: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm, ['scaleY'])}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <label className={labelClass}>
                <span>Opacity</span>
                <input
                  type='number'
                  min={0}
                  max={1}
                  step={0.01}
                  value={designForm.opacity}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, opacity: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm, ['opacity'])}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                <span>Rotation</span>
                <input
                  type='number'
                  step={0.1}
                  value={designForm.angle}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, angle: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm, ['angle'])}
                  className={fieldClass}
                />
              </label>
            </div>

            {supportsFill ? (
              <label className={`block ${labelClass}`}>
                <span>Fill</span>
                <div className='space-y-2 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-muted)] p-2'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setActiveColorField('fill');
                      }}
                      className='h-5 w-5 shrink-0 rounded border border-[var(--wise-border)]'
                      style={{ backgroundColor: normalizeHexColor(designForm.fill) }}
                    />
                    <HexColorInput
                      color={normalizeHexColor(designForm.fill)}
                      prefixed
                      onFocus={() => {
                        setActiveColorField('fill');
                      }}
                      onChange={(value) => {
                        setColorField('fill', `#${value.replace(/^#/, '')}`, false);
                      }}
                      onBlur={() => {
                        setColorField('fill', normalizeHexColor(designForm.fill), true);
                      }}
                      className={fieldClass}
                    />
                  </div>
                  {activeColorField === 'fill' ? (
                    <HexColorPicker
                      color={normalizeHexColor(designForm.fill)}
                      onChange={(value) => {
                        setColorField('fill', value, true);
                      }}
                      className='!w-full'
                    />
                  ) : null}
                </div>
              </label>
            ) : null}

            {supportsStroke ? (
              <label className={`block ${labelClass}`}>
                <span>Stroke</span>
                <div className='space-y-2 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-muted)] p-2'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setActiveColorField('stroke');
                      }}
                      className='h-5 w-5 shrink-0 rounded border border-[var(--wise-border)]'
                      style={{
                        backgroundColor: normalizeHexColor(designForm.stroke, '#0f172a'),
                      }}
                    />
                    <HexColorInput
                      color={normalizeHexColor(designForm.stroke, '#0f172a')}
                      prefixed
                      onFocus={() => {
                        setActiveColorField('stroke');
                      }}
                      onChange={(value) => {
                        setColorField('stroke', `#${value.replace(/^#/, '')}`, false);
                      }}
                      onBlur={() => {
                        setColorField(
                          'stroke',
                          normalizeHexColor(designForm.stroke, '#0f172a'),
                          true,
                        );
                      }}
                      className={fieldClass}
                    />
                  </div>
                  {activeColorField === 'stroke' ? (
                    <HexColorPicker
                      color={normalizeHexColor(designForm.stroke, '#0f172a')}
                      onChange={(value) => {
                        setColorField('stroke', value, true);
                      }}
                      className='!w-full'
                    />
                  ) : null}
                </div>
              </label>
            ) : null}

            <div className='space-y-2 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-muted)] p-2'>
              <label className={labelClass}>
                <span>Mask Source</span>
                <select
                  value={maskForm.sourceId}
                  onChange={(event) => {
                    const nextMaskForm = { sourceId: event.target.value };
                    setMaskForm(nextMaskForm);
                    commitMaskForm(nextMaskForm);
                  }}
                  className={fieldClass}
                >
                  <option value={NONE_MASK_SOURCE_ID}>None</option>
                  {maskCandidates.map((maskItem) => (
                    <option key={maskItem.id} value={maskItem.id}>
                      {maskItem.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className='text-[11px] text-[#8f8f8f]'>
                Uses another canvas item as this object's mask.
              </p>
            </div>

            {supportsText ? (
              <label className={`block ${labelClass}`}>
                <span>Text</span>
                <textarea
                  value={designForm.text}
                  onChange={(event) => {
                    setDesignForm((prev) => ({ ...prev, text: event.target.value }));
                  }}
                  onBlur={() => commitDesignForm(designForm)}
                  rows={3}
                  className='w-full resize-y rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1.5 text-[11px] text-[#efefef] outline-none focus:border-[#0d99ff] focus:ring-1 focus:ring-[#0d99ff]/45'
                />
              </label>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function toNumberInput(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(fallback);
}

function readDesignForm(instance?: AnimatableObject): DesignFormState {
  if (!instance) return EMPTY_FORM;
  const object = instance.fabricObject;

  return {
    left: toNumberInput(object.left, 0),
    top: toNumberInput(object.top, 0),
    scaleX: toNumberInput(object.scaleX, 1),
    scaleY: toNumberInput(object.scaleY, 1),
    opacity: toNumberInput(object.opacity, 1),
    angle: toNumberInput(object.angle, 0),
    fill: typeof object.get('fill') === 'string' ? String(object.get('fill')) : '',
    stroke:
      typeof object.get('stroke') === 'string' ? String(object.get('stroke')) : '',
    text: typeof object.get('text') === 'string' ? String(object.get('text')) : '',
  };
}

function normalizeHexColor(value: string, fallback = '#0d99ff') {
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function readMaskSourceId(instance?: AnimatableObject): string {
  if (!instance) return NONE_MASK_SOURCE_ID;

  const clipPath = instance.fabricObject.clipPath;
  if (!clipPath) return NONE_MASK_SOURCE_ID;

  const sourceId =
    typeof clipPath.customId === 'string' ? clipPath.customId : undefined;
  if (sourceId && sourceId.length > 0) {
    return sourceId;
  }

  return NONE_MASK_SOURCE_ID;
}

function clearMaskFromObject(instance: AnimatableObject) {
  clearMaskSync(instance);
  instance.fabricObject.set('clipPath', null);
  instance.fabricObject.set('dirty', true);
  instance.fabricObject.canvas?.requestRenderAll();
}

function applyMaskFromCanvasObject(
  target: AnimatableObject,
  source: AnimatableObject,
) {
  clearMaskSync(target);
  source.fabricObject.set('absolutePositioned', true);
  target.fabricObject.set('clipPath', source.fabricObject);
  target.fabricObject.set('dirty', true);
  target.fabricObject.canvas?.requestRenderAll();

  const syncMask = () => {
    target.fabricObject.set('dirty', true);
    target.fabricObject.canvas?.requestRenderAll();
  };

  MASK_SYNC_EVENTS.forEach((eventName) => {
    source.fabricObject.on(eventName, syncMask);
  });

  setMaskSyncCleanup(target, () => {
    MASK_SYNC_EVENTS.forEach((eventName) => {
      source.fabricObject.off(eventName, syncMask);
    });
  });
}

function setMaskSyncCleanup(instance: AnimatableObject, cleanup: () => void) {
  const objectWithCleanup = instance.fabricObject as {
    __maskSyncCleanup?: () => void;
  };
  objectWithCleanup.__maskSyncCleanup = cleanup;
}

function clearMaskSync(instance: AnimatableObject) {
  const objectWithCleanup = instance.fabricObject as {
    __maskSyncCleanup?: () => void;
  };
  objectWithCleanup.__maskSyncCleanup?.();
  delete objectWithCleanup.__maskSyncCleanup;
}
