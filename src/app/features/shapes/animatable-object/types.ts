/** Types.Ts shape model and behavior. */
export type NumericAnimatableProperties = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
  opacity: number;
  angle: number;
  strokeWidth: number;
};

export type ColorAnimatableProperties = {
  fill: string;
  stroke: string;
};

export type AnimatableProperties = NumericAnimatableProperties &
  ColorAnimatableProperties;

export type ColorVector = Uint8Array;

export type AnimatableSnapshot = {
  [K in keyof NumericAnimatableProperties]: NumericAnimatableProperties[K];
};

export type KeyframeEasing =
  | "linear"
  | "step"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "elastic"
  | "bounce";

export type ColorSnapshot = Partial<{
  [K in keyof ColorAnimatableProperties]: ColorAnimatableProperties[K];
}>;

export interface Keyframe<
  K extends keyof NumericAnimatableProperties =
    keyof NumericAnimatableProperties,
> {
  id: string;
  property: K;
  value: NumericAnimatableProperties[K];
  time: number;
  easing: KeyframeEasing;
}

export interface ColorKeyframe<
  K extends keyof ColorAnimatableProperties = keyof ColorAnimatableProperties,
> {
  id: string;
  property: K;
  value: ColorVector;
  time: number;
  easing: KeyframeEasing;
}

export type TimelineMarker = {
  id: string;
  time: number;
};

export type KeyframesByProperty = Partial<
  Record<keyof NumericAnimatableProperties, Keyframe[]>
>;
export type ColorKeyframesByProperty = Partial<
  Record<keyof ColorAnimatableProperties, ColorKeyframe[]>
>;
