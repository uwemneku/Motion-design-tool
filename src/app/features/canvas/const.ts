import type { AnimatableProperties } from '../shapes/animatable-object/types';

export const CANVAS_KEYFRAME_EPSILON = 0.001;
export const CANVAS_ZOOM_SENSITIVITY = 0.05;
export const EXPORT_DURATION_SECONDS = 10;
export const EXPORT_FPS = 30;
export const EXPORT_PIXEL_DENSITY = 1;
export const FAB_EDGE_PADDING = 12;
export const FIGMA_BLUE = '#2563eb';
export const FIGMA_BLUE_LIGHT = 'rgba(37, 99, 235, 0.12)';
export const IMAGE_PLACEHOLDER_HEIGHT_RATIO = 0.32;
export const IMAGE_PLACEHOLDER_MIN_SIZE = 140;
export const IMAGE_PLACEHOLDER_PULSE_DURATION_MS = 900;
export const IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY = 0.88;
export const IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY = 0.34;
export const IMAGE_PLACEHOLDER_WIDTH_RATIO = 0.36;
export const MAX_BORDER_SCALE_FACTOR = 4;
export const MAX_CANVAS_ZOOM = 4;
export const MIN_BORDER_SCALE_FACTOR = 0.5;
export const MIN_CANVAS_ZOOM = 0.25;
export const TOOL_BUTTON_CLASS =
  'grid size-8 place-items-center rounded-md border border-[var(--wise-border)] ' +
  'bg-[var(--wise-surface)] text-[#e6e6e6] transition ' +
  'hover:border-[#5f5f5f] hover:bg-[var(--wise-surface-muted)]';
export const NUMERIC_ANIMATABLE_PROPERTIES: (keyof AnimatableProperties)[] = [
  'left',
  'top',
  'scaleX',
  'scaleY',
  'opacity',
  'angle',
];
export const VIDEO_ASPECT_PRESETS = [
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '1:1', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
];
