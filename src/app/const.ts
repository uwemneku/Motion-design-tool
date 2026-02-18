import type { KeyframeEasing } from './features/shapes/animatable-object/types';
import type { AnimatableProperties } from './features/shapes/animatable-object/types';

export const AGENT_SYSTEM_PROMPT =
  'You are a motion editor agent. Follow this fixed loop: ' +
  '1) read project context, 2) decide exactly one action, 3) execute, ' +
  '4) re-read context, 5) repeat until done or user input is needed. ' +
  'You must output exactly one decision each step. Never output multiple ' +
  'actions in one step. Prefer target.id from context for updates/deletes. ' +
  'Respect video boundaries whenever possible. For text creation choose ' +
  'accessible dark colors on light backgrounds. Always inspect current item ' +
  'properties (including width/height/scaled size and text/font fields) from ' +
  'project context before and after each action. When adding text, decide if ' +
  'text width should be increased or decreased to fit the video area and avoid ' +
  'unwanted wrapping/overflow, then use update_item on the new text item width. ' +
  'IMPORTANT: Fabric object origin is center, so boundary math must use center ' +
  'position with half scaled width/height offsets (do not treat left/top as top-left). ' +
  'For images: if user gave no ' +
  'URL, use prompt generation; generated images must be PNG and <=2MB. ' +
  'When finished, use status=done with a concise markdown summary. If ' +
  'blocked by missing details, use status=needs_user_input and ask one clear question.';
export const CANVAS_KEYFRAME_EPSILON = 0.001;
export const CANVAS_ZOOM_SENSITIVITY = 0.05;
export const EASING_OPTIONS: KeyframeEasing[] = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'elastic',
  'bounce',
];
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
export const KEYFRAME_SECTION_HORIZONTAL_PADDING = 12; // Tailwind px-3
export const LABEL_COLUMN_WIDTH = 180;
export const MAX_AGENT_STEPS = 10;
export const MAX_BORDER_SCALE_FACTOR = 4;
export const MAX_CANVAS_ZOOM = 4;
export const MIN_BORDER_SCALE_FACTOR = 0.5;
export const MIN_CANVAS_ZOOM = 0.25;
export const NUMERIC_ANIMATABLE_PROPERTIES: (keyof AnimatableProperties)[] = [
  'left',
  'top',
  'scaleX',
  'scaleY',
  'opacity',
  'angle',
];
export const TIMELINE_DEFAULT_HEIGHT = 160;
export const TIMELINE_DURATION = 10;
export const TIMELINE_LABEL_STEP = 1;
export const TIMELINE_MAX_HEIGHT = 420;
export const TIMELINE_MIN_HEIGHT = 120;
export const TIME_EPSILON = 0.0001;
export const TOOL_BUTTON_CLASS =
  'grid size-8 place-items-center rounded-md border border-[var(--wise-border)] ' +
  'bg-[var(--wise-surface)] text-[#e6e6e6] transition ' +
  'hover:border-[#5f5f5f] hover:bg-[var(--wise-surface-muted)]';
export const TRACK_MIN_WIDTH = 1200;
export const VIDEO_ASPECT_PRESETS = [
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '1:1', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
];
