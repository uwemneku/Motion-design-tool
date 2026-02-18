/** Util.Ts canvas side panel UI logic. */
import {
  EMPTY_FORM,
  GOOGLE_FONT_FAMILY_QUERY,
  HEX_COLOR_PATTERN,
} from "../../../../const";
import type { DesignFormState } from "../../../../types";
import type { AnimatableObject } from "../../shapes/animatable-object/object";

export function toNumberInput(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(fallback);
}

export function readDesignForm(instance?: AnimatableObject): DesignFormState {
  if (!instance) return EMPTY_FORM;
  const object = instance.fabricObject;

  return {
    left: toNumberInput(object.left, 0),
    top: toNumberInput(object.top, 0),
    scaleX: toNumberInput(object.scaleX, 1),
    scaleY: toNumberInput(object.scaleY, 1),
    opacity: toNumberInput(object.opacity, 1),
    angle: toNumberInput(object.angle, 0),
    fill:
      typeof object.get("fill") === "string" ? String(object.get("fill")) : "",
    stroke:
      typeof object.get("stroke") === "string"
        ? String(object.get("stroke"))
        : "",
    strokeWidth: toNumberInput(object.get("strokeWidth"), 1),
    text:
      typeof object.get("text") === "string" ? String(object.get("text")) : "",
    fontFamily:
      typeof object.get("fontFamily") === "string"
        ? String(object.get("fontFamily"))
        : EMPTY_FORM.fontFamily,
    fontSize: toNumberInput(
      object.get("fontSize"),
      Number(EMPTY_FORM.fontSize),
    ),
    fontStyle:
      typeof object.get("fontStyle") === "string"
        ? String(object.get("fontStyle"))
        : EMPTY_FORM.fontStyle,
    fontWeight:
      typeof object.get("fontWeight") === "string" ||
      typeof object.get("fontWeight") === "number"
        ? String(object.get("fontWeight"))
        : EMPTY_FORM.fontWeight,
  };
}

export function normalizeHexColor(value: string, fallback = "#38bdf8") {
  // Normalize to long-form lowercase hex and preserve alpha channels when provided.
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (trimmed.length === 5) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    const a = trimmed[4];
    return `#${r}${r}${g}${g}${b}${b}${a}${a}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function ensureGoogleFontsLoaded() {
  if (typeof document === "undefined") return;
  const existingLink = document.getElementById("editor-google-fonts");
  if (existingLink) return;

  const preconnectApi = document.createElement("link");
  preconnectApi.rel = "preconnect";
  preconnectApi.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnectApi);

  const preconnectStatic = document.createElement("link");
  preconnectStatic.rel = "preconnect";
  preconnectStatic.href = "https://fonts.gstatic.com";
  preconnectStatic.crossOrigin = "anonymous";
  document.head.appendChild(preconnectStatic);

  const fontLink = document.createElement("link");
  fontLink.id = "editor-google-fonts";
  fontLink.rel = "stylesheet";
  fontLink.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONT_FAMILY_QUERY}&display=swap`;
  document.head.appendChild(fontLink);
}

import type {
  AnimationTemplate,
  TextAnimationTemplate,
} from "../../../../types";

export const sectionTitleClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[#b8b8b8]";
export const labelClass = "space-y-1 text-[11px] text-[#b1b1b1]";
export const fieldClass =
  "h-7 w-full rounded-md border border-[var(--wise-border)] " +
  "bg-[var(--wise-surface)] px-2 text-[11px] text-[#efefef] " +
  "outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/45";
export const cardClass =
  "space-y-2 rounded-md border border-[var(--wise-border)] " +
  "bg-[var(--wise-surface)] p-2.5";

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
