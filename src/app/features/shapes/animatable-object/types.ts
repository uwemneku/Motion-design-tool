export type AnimatableProperties = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  angle: number;
};

export type AnimatableSnapshot = {
  [K in keyof AnimatableProperties]: AnimatableProperties[K];
};

export interface Keyframe<K extends keyof AnimatableProperties = keyof AnimatableProperties> {
  id: string;
  property: K;
  value: AnimatableProperties[K];
  time: number;
  easing: "linear";
}

export type TimelineMarker = {
  id: string;
  time: number;
};

export type KeyframesByProperty = Partial<Record<keyof AnimatableProperties, Keyframe[]>>;
