import type {
  AnimationTemplate,
  TextAnimationTemplate,
} from "./canvas-side-panel.types";

export const KEYFRAME_EPSILON = 0.001;

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
