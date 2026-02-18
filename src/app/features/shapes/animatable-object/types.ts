export type AnimatableProperties = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  angle: number;
};

export type ColorAnimatableProperties = {
  fill: string;
  stroke: string;
};

export type AnimatableSnapshot = {
  [K in keyof AnimatableProperties]: AnimatableProperties[K];
};

export type KeyframeEasing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'elastic'
  | 'bounce';

export type ColorSnapshot = Partial<{
  [K in keyof ColorAnimatableProperties]: ColorAnimatableProperties[K];
}>;

export interface Keyframe<K extends keyof AnimatableProperties = keyof AnimatableProperties> {
  id: string;
  property: K;
  value: AnimatableProperties[K];
  time: number;
  easing: KeyframeEasing;
}

export interface ColorKeyframe<
  K extends keyof ColorAnimatableProperties = keyof ColorAnimatableProperties,
> {
  id: string;
  property: K;
  value: ColorAnimatableProperties[K];
  time: number;
  easing: KeyframeEasing;
}

export type TimelineMarker = {
  id: string;
  time: number;
};

export type KeyframesByProperty = Partial<Record<keyof AnimatableProperties, Keyframe[]>>;
export type ColorKeyframesByProperty = Partial<
  Record<keyof ColorAnimatableProperties, ColorKeyframe[]>
>;
