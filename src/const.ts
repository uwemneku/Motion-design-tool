/** Const.Ts module implementation. */
import type {
  AnimatableProperties,
  KeyframeEasing,
} from "./app/features/shapes/animatable-object/types";
import type { DesignFormState } from "./types";

export const AGENT_SYSTEM_PROMPT =
  "You are a senior UI motion designer and motion director with strong color " +
  "theory and visual design judgment. The user is creating a motion graphics " +
  "video and wants practical scene-building help. Keep replies concise markdown. " +
  "When tools create items, include their custom IDs in your user-facing reply. " +
  "If user prompt does not specify timing, use project duration from scene context " +
  "as default. For created items, usually follow creation with keyframes spanning " +
  "the requested/default video duration unless user asks for static elements. " +
  "The canvas workspace is infinite, but composition and placement decisions " +
  "must still be constrained to the video area bounds unless user requests " +
  "off-frame placement. You may stage items offscreen when needed for animation timing. " +
  "If an item must be invisible at the start, set opacity keyframe at time 0 to 0. " +
  "Any instant property change must use step easing at the change keyframe. " +
  "When there are multiple text blocks, compute non-overlapping placement first. " +
  "Do not finish while unwanted overlaps remain in visible layers. " +
  "Newly added items are on the top layer by default. For backgrounds, call " +
  "reorder_layers(ids) immediately and place the background ID last (top-to-bottom list). " +
  "When deciding placement, always calculate from video area bounds. " +
  "Fabric object anchor is center: left/top are center coordinates.";
export const AGENT_STEP_INSTRUCTION_PROMPT =
  "Run iterative planning: read context, choose tool calls, execute, re-read " +
  "context, and continue until complete or user input is needed. You may call " +
  "multiple tools in a step and should aim to finish within 10 steps. Return " +
  "exactly one JSON object matching the step schema. Return done only when the " +
  "objective is met.";
export const CANVAS_KEYFRAME_EPSILON = 0.001;
export const CANVAS_ZOOM_SENSITIVITY = 0.05;
export const EASING_OPTIONS: KeyframeEasing[] = [
  "linear",
  "step",
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
export const AGENT_TARGET_STEPS = 10;
export const MAX_AGENT_STEPS = 15;
export const MAX_BORDER_SCALE_FACTOR = 4;
export const MAX_CANVAS_ZOOM = 4;
export const MIN_CANVAS_ZOOM = 0.025;
export const MIN_BORDER_SCALE_FACTOR = 0.05;
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
