/** Shared constants and pure helpers for the canvas design side panel. */
import type { FabricObject } from "fabric";

import type { DesignFormState } from "../../../../types";
import type {
  AnimatableProperties,
  ColorAnimatableProperties,
  NumericAnimatableProperties,
} from "../../shapes/animatable-object/types";

export type ColorFieldKey = keyof ColorAnimatableProperties;
export type KeyframeField = keyof Omit<DesignFormState, "text">;
export type NumericFieldKey = keyof NumericAnimatableProperties | "fontSize";
export type SupportedKeyframeField = keyof AnimatableProperties;

export type HorizontalAlignment = "left" | "center" | "right";
export type VerticalAlignment = "bottom" | "middle" | "top";

export type TransformFieldConfig = {
  changedField: NumericFieldKey;
  groupLabel: string;
  inputClassName?: string;
  keyframeField: SupportedKeyframeField;
  keyframeLabel: string;
  prefix: string;
};

export type NumericScrubField = Exclude<NumericFieldKey, "fontSize">;

type NumericScrubConfig = {
  baseStep: number;
  max?: number;
  min?: number;
};

export type NumericScrubSession = {
  field: NumericScrubField;
  pointerId: number;
  startForm: DesignFormState;
  startValue: number;
  startX: number;
};

export const INPUT_PRECISION = 3;
export const NUMERIC_INPUT_PATTERN = /^-?\d*\.?\d*$/;
export const NUMERIC_KEYFRAME_FIELDS: readonly NumericScrubField[] = [
  "left",
  "top",
  "width",
  "height",
  "opacity",
  "angle",
  "strokeWidth",
];

export const TRANSFORM_FIELD_ROWS: readonly [TransformFieldConfig, TransformFieldConfig][] = [
  [
    {
      changedField: "left",
      groupLabel: "Position",
      keyframeField: "left",
      keyframeLabel: "Position X",
      prefix: "X",
    },
    {
      changedField: "top",
      groupLabel: "Position",
      keyframeField: "top",
      keyframeLabel: "Position Y",
      prefix: "Y",
    },
  ],
  [
    {
      changedField: "width",
      groupLabel: "Dimensions",
      keyframeField: "width",
      keyframeLabel: "Width",
      prefix: "W",
    },
    {
      changedField: "height",
      groupLabel: "Dimensions",
      keyframeField: "height",
      keyframeLabel: "Height",
      prefix: "H",
    },
  ],
  [
    {
      changedField: "opacity",
      groupLabel: "Appearance",
      keyframeField: "opacity",
      keyframeLabel: "Opacity",
      prefix: "O",
    },
    {
      changedField: "angle",
      groupLabel: "Rotation",
      keyframeField: "angle",
      keyframeLabel: "Rotation",
      prefix: "R",
    },
  ],
];

export const HORIZONTAL_ALIGNMENT_CONTROLS: readonly {
  action: HorizontalAlignment;
  label: string;
}[] = [
  { action: "left", label: "Align left" },
  { action: "center", label: "Align horizontal center" },
  { action: "right", label: "Align right" },
];

export const VERTICAL_ALIGNMENT_CONTROLS: readonly {
  action: VerticalAlignment;
  label: string;
}[] = [
  { action: "top", label: "Align top" },
  { action: "middle", label: "Align vertical center" },
  { action: "bottom", label: "Align bottom" },
];

const NUMERIC_SCRUB_CONFIG: Record<NumericScrubField, NumericScrubConfig> = {
  angle: { baseStep: 1 },
  height: { baseStep: 1, min: 0 },
  left: { baseStep: 1 },
  opacity: { baseStep: 0.01, min: 0, max: 1 },
  strokeWidth: { baseStep: 1, min: 0 },
  top: { baseStep: 1 },
  width: { baseStep: 1, min: 0 },
};

/** Clamps a number to an inclusive range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Clamps a number to a minimum floor. */
export function clampMin(value: number, min: number) {
  return Math.max(min, value);
}

/** Rounds numeric form values to the shared input precision. */
export function toPrecisionNumber(value: number) {
  if (!Number.isFinite(value)) return Number.NaN;
  return Number(value.toFixed(INPUT_PRECISION));
}

/** Formats a numeric value for the compact form inputs. */
export function formatNumberInput(value: number) {
  return Number(value.toFixed(INPUT_PRECISION)).toString();
}

/** Returns the scrub sensitivity multiplier for modifier-assisted dragging. */
export function getScrubStepMultiplier(isShiftKey: boolean, isAltKey: boolean) {
  if (isShiftKey) return 10;
  if (isAltKey) return 0.1;
  return 1;
}

/** Clamps a scrubbed value using the per-field numeric limits. */
export function normalizeScrubbedValue(field: NumericScrubField, value: number) {
  const config = NUMERIC_SCRUB_CONFIG[field];
  let nextValue = toPrecisionNumber(value);

  if (typeof config.min === "number") {
    nextValue = Math.max(config.min, nextValue);
  }
  if (typeof config.max === "number") {
    nextValue = Math.min(config.max, nextValue);
  }

  return nextValue;
}

/** Builds the next form snapshot for a pointer-scrubbed numeric field. */
export function buildScrubbedDesignForm(
  form: DesignFormState,
  field: NumericScrubField,
  startValue: number,
  deltaX: number,
  isShiftKey: boolean,
  isAltKey: boolean,
) {
  const config = NUMERIC_SCRUB_CONFIG[field];
  const nextValue = normalizeScrubbedValue(
    field,
    startValue + deltaX * config.baseStep * getScrubStepMultiplier(isShiftKey, isAltKey),
  );

  return {
    ...form,
    [field]: formatNumberInput(nextValue),
  };
}

/** Builds the next string value for a pointer-scrubbed numeric field input. */
export function buildScrubbedFieldValue(
  field: NumericScrubField,
  startValue: number,
  deltaX: number,
  isShiftKey: boolean,
  isAltKey: boolean,
) {
  const nextValue = normalizeScrubbedValue(
    field,
    startValue +
      deltaX * NUMERIC_SCRUB_CONFIG[field].baseStep * getScrubStepMultiplier(isShiftKey, isAltKey),
  );

  return formatNumberInput(nextValue);
}

export const removeNull = <T>(entry: {
  id: string;
  item: T | null;
}): entry is {
  id: string;
  item: NonNullable<typeof entry.item>;
} => entry.item !== null;

/** Returns only the numeric keyframe fields from a mixed field list. */
export function getNumericKeyframeFields(fields: KeyframeField[]) {
  return Array.from(
    new Set(
      fields.filter((field): field is NumericScrubField => {
        return NUMERIC_KEYFRAME_FIELDS.includes(field as NumericScrubField);
      }),
    ),
  );
}

/** Reads the current numeric value for a keyframe-capable field from a Fabric object. */
export function getNumericKeyframeValue(
  object: FabricObject,
  field: NumericScrubField,
) {
  if (field === "width") return object.getScaledWidth();
  if (field === "height") return object.getScaledHeight();
  if (field === "strokeWidth") return Number(object.get("strokeWidth"));
  return Number(object.get(field));
}
