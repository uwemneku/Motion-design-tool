import type { KeyframeEasing } from '../../shapes/animatable-object/types';

export const EASING_OPTIONS: KeyframeEasing[] = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'elastic',
  'bounce',
];
export const KEYFRAME_SECTION_HORIZONTAL_PADDING = 12; // Tailwind px-3
export const LABEL_COLUMN_WIDTH = 180;
export const TIMELINE_DEFAULT_HEIGHT = 160;
export const TIMELINE_DURATION = 10;
export const TIMELINE_LABEL_STEP = 1;
export const TIMELINE_MAX_HEIGHT = 420;
export const TIMELINE_MIN_HEIGHT = 120;
export const TIME_EPSILON = 0.0001;
export const TRACK_MIN_WIDTH = 1200;
