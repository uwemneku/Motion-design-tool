/** Const.Ts module implementation. */
import type {
  AnimatableProperties,
  KeyframeEasing,
} from "./app/features/shapes/animatable-object/types";
import type { DesignFormState } from "./types";

export const AGENT_SYSTEM_PROMPT =
  "You are a senior UI motion designer and motion director with strong color " +
  "theory and visual design judgment. The user is creating a motion graphics " +
  "video and wants practical scene-building help. Run an iterative loop: read context, " +
  "choose tool calls, execute, re-read context, and continue until objective " +
  "is complete or user input is needed. Keep replies concise markdown. " +
  "When tools create items, include their custom IDs in your user-facing reply. " +
  "Understand keyframes in scene context as: keyframeTimes is a quick timeline " +
  "index per item, while keyframes stores per-property arrays of frames where " +
  "each frame is { id, time, value }. " +
  "When deciding placement, always calculate positions from the video area " +
  "(videoLeft/videoTop/videoRight/videoBottom/videoWidth/videoHeight), not " +
  "the full canvas. Treat video area as the primary composition frame. " +
  "Fabric object anchor is center: left/top are center coordinates, not top-left. " +
  "Use bounds math with half sizes: leftBound=centerX-scaledWidth/2, " +
  "rightBound=centerX+scaledWidth/2, topBound=centerY-scaledHeight/2, " +
  "bottomBound=centerY+scaledHeight/2. " +
  "Current available tools are add_circle(color?, left?, right?, top?, radius?), " +
  "add_polygon(color?, left?, right?, top?, width?, height?, sides?), " +
  "add_line(color?, left?, right?, top?, width?, height?), " +
  "add_rectangle(color?, left?, right?, top?), add_text(text?, color?, left?, " +
  "right?, top?, width?), update_item_by_id(id, props?, keyframes?), and " +
  "set_video_aspect_ratio(aspectLabel: " +
  "16:9 | 9:16 | 1:1 | 4:5). You may call tools multiple times in one step " +
  "when useful. Return done only when objective is met.";
export const CANVAS_KEYFRAME_EPSILON = 0.001;
export const CANVAS_ZOOM_SENSITIVITY = 0.05;
export const EASING_OPTIONS: KeyframeEasing[] = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "elastic",
  "bounce",
];
export const EXPORT_DURATION_SECONDS = 10;
export const EXPORT_FPS = 30;
export const EXPORT_PIXEL_DENSITY = 1;
export const FAB_EDGE_PADDING = 12;
export const FIGMA_BLUE = "#38bdf8";
export const FIGMA_BLUE_LIGHT = "rgba(56, 189, 248, 0.12)";
export const IMAGE_PLACEHOLDER_HEIGHT_RATIO = 0.32;
export const IMAGE_PLACEHOLDER_MIN_SIZE = 140;
export const IMAGE_PLACEHOLDER_PULSE_DURATION_MS = 900;
export const IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY = 0.88;
export const IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY = 0.34;
export const IMAGE_PLACEHOLDER_WIDTH_RATIO = 0.36;
export const KEYFRAME_SECTION_HORIZONTAL_PADDING = 20;
export const LABEL_COLUMN_WIDTH = 210;
export const MAX_AGENT_STEPS = 10;
export const MAX_BORDER_SCALE_FACTOR = 4;
export const MAX_CANVAS_ZOOM = 4;
export const MIN_BORDER_SCALE_FACTOR = 0.5;
export const MIN_CANVAS_ZOOM = 0.25;
export const NUMERIC_ANIMATABLE_PROPERTIES: (keyof AnimatableProperties)[] = [
  "left",
  "top",
  "scaleX",
  "scaleY",
  "opacity",
  "angle",
];
export const TIMELINE_DEFAULT_HEIGHT = 160;
export const TIMELINE_DURATION = 10;
export const TIMELINE_LABEL_STEP = 1;
export const TIMELINE_MAX_HEIGHT = 420;
export const TIMELINE_MIN_HEIGHT = 120;
export const TIME_EPSILON = 0.0001;
export const TOOL_BUTTON_CLASS =
  "grid size-8 place-items-center rounded-md border border-[var(--wise-border)] " +
  "bg-[var(--wise-surface)] text-[#e6e6e6] transition " +
  "hover:border-[#5f5f5f] hover:bg-[var(--wise-surface-muted)]";
export const TOOL_SLIDER_CLASS =
  "h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-2 " +
  "[&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-runnable-track]:bg-transparent " +
  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full " +
  "[&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1 " +
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:appearance-none " +
  "[&::-webkit-slider-thumb]:rounded-[4px] " +
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#9fd7ff] " +
  "[&::-webkit-slider-thumb]:bg-[#38bdf8] " +
  "[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(56,189,248,0.24)] " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 " +
  "[&::-moz-range-thumb]:rounded-[4px] [&::-moz-range-thumb]:border " +
  "[&::-moz-range-thumb]:border-[#9fd7ff] [&::-moz-range-thumb]:bg-[#38bdf8]";
export const TRACK_MIN_WIDTH = 1200;
export const VIDEO_ASPECT_PRESETS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
];

export const NONE_MASK_SOURCE_ID = "none";
export const HEX_COLOR_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const EMPTY_FORM: DesignFormState = {
  left: "0",
  top: "0",
  scaleX: "1",
  scaleY: "1",
  opacity: "1",
  angle: "0",
  fill: "",
  stroke: "",
  strokeWidth: "1",
  text: "",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: "44",
  fontStyle: "normal",
  fontWeight: "700",
};
export const FONT_FAMILY_PRESETS = [
  "Inter",
  "DM Sans",
  "Manrope",
  "Space Grotesk",
  "Sora",
  "Outfit",
  "Plus Jakarta Sans",
  "Poppins",
  "Montserrat",
  "Bricolage Grotesque",
  "Merriweather",
  "Playfair Display",
  "Archivo Black",
  "IBM Plex Sans",
  "Arial",
  "Helvetica",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "IBM Plex Mono",
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
];
export const GOOGLE_FONT_FAMILY_QUERY =
  "Inter:wght@100;200;300;400;500;600;700;800;900&" +
  "family=DM+Sans:wght@100;200;300;400;500;600;700;800;900&" +
  "family=Manrope:wght@200;300;400;500;600;700;800&" +
  "family=Space+Grotesk:wght@300;400;500;600;700&" +
  "family=Sora:wght@100;200;300;400;500;600;700;800&" +
  "family=Outfit:wght@100;200;300;400;500;600;700;800;900&" +
  "family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&" +
  "family=Poppins:wght@100;200;300;400;500;600;700;800;900&" +
  "family=Montserrat:wght@100;200;300;400;500;600;700;800;900&" +
  "family=Bricolage+Grotesque:wght@200;300;400;500;600;700;800&" +
  "family=Merriweather:wght@300;400;700;900&" +
  "family=Playfair+Display:wght@400;500;600;700;800;900&" +
  "family=Archivo+Black&" +
  "family=IBM+Plex+Sans:wght@100;200;300;400;500;600;700&" +
  "family=IBM+Plex+Mono:wght@100;200;300;400;500;600;700&" +
  "family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&" +
  "family=Fira+Code:wght@300;400;500;600;700&" +
  "family=Source+Code+Pro:wght@200;300;400;500;600;700;800;900";
export const FONT_STYLE_OPTIONS = ["normal", "italic", "oblique"] as const;
export const FONT_WEIGHT_OPTIONS = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;
export const MASK_SYNC_EVENTS = [
  "moving",
  "scaling",
  "rotating",
  "skewing",
  "modified",
] as const;
