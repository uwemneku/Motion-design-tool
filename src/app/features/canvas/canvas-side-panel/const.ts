import type { AnimationTemplate, TextAnimationTemplate } from "./types";
import type { DesignFormState } from "./types";

export const KEYFRAME_EPSILON = 0.001;
export const NONE_MASK_SOURCE_ID = "none";
export const HEX_COLOR_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const sectionTitleClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[#b8b8b8]";
export const labelClass = "space-y-1 text-[11px] text-[#b1b1b1]";
export const fieldClass =
  "h-7 w-full rounded-md border border-[var(--wise-border)] " +
  "bg-[var(--wise-surface)] px-2 text-[11px] text-[#efefef] " +
  "outline-none focus:border-[#0d99ff] focus:ring-1 focus:ring-[#0d99ff]/45";
export const cardClass =
  "space-y-2 rounded-md border border-[var(--wise-border)] " +
  "bg-[var(--wise-surface)] p-2.5";
export const EMPTY_FORM: DesignFormState = {
  left: "0",
  top: "0",
  scaleX: "1",
  scaleY: "1",
  opacity: "1",
  angle: "0",
  fill: "",
  stroke: "",
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
  "changed",
] as const;

export const animationTemplates: AnimationTemplate[] = [
  {
    id: "fade_in",
    name: "Fade In",
    description: "Opacity 0 to 100%",
    duration: 0.8,
  },
  {
    id: "fade_out",
    name: "Fade Out",
    description: "Opacity 100% to 0",
    duration: 0.8,
  },
  {
    id: "zoom_in",
    name: "Zoom In",
    description: "Scale up into frame",
    duration: 0.9,
  },
  {
    id: "zoom_out",
    name: "Zoom Out",
    description: "Scale down out of frame",
    duration: 0.9,
  },
  {
    id: "text_pop_in",
    name: "Pop In",
    description: "Quick scale-up with settle",
    duration: 0.55,
  },
  {
    id: "text_flicker",
    name: "Flicker",
    description: "Blinking reveal effect",
    duration: 0.7,
  },
  {
    id: "text_wiggle",
    name: "Wiggle",
    description: "Small angle jitter motion",
    duration: 0.65,
  },
];

export const textAnimationTemplates: TextAnimationTemplate[] = [
  {
    id: "text_chars_rise",
    name: "Chars Rise",
    description: "Staggered per-letter reveal",
    duration: 1.2,
  },
];
