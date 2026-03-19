/** Util.Ts canvas side panel UI logic. */
import type { FabricObject } from "fabric";
import {
  EMPTY_FORM,
  HEX_COLOR_PATTERN,
  POPULAR_GOOGLE_FONT_FAMILIES,
} from "../../../../const";
import type { DesignFormState } from "../../../../types";
import type { AnimatableObject } from "../../shapes/animatable-object/object";
import { getObjectAnimationPosition } from "../../shapes/animatable-object/util";

export function toNumberInput(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(fallback);
}

export function readDesignForm(instance?: AnimatableObject): DesignFormState {
  return readDesignFormFromObject(instance?.fabricObject);
}

/** Extracts the display family name from a CSS font-family string. */
export function getPrimaryFontFamilyName(fontFamily: string) {
  const [primaryFamily = EMPTY_FORM.fontFamily] = fontFamily.split(",");
  return primaryFamily.trim().replace(/^["']|["']$/g, "");
}

/** Reads editable transform and style values from a Fabric object. */
export function readDesignFormFromObject(
  object?: FabricObject | null,
): DesignFormState {
  if (!object) return EMPTY_FORM;
  const supportsImageBorder = object.type === "image";
  const position = getObjectAnimationPosition(object);

  return {
    left: toNumberInput(position.left, 0),
    top: toNumberInput(position.top, 0),
    width: toNumberInput(object.getScaledWidth(), 1),
    height: toNumberInput(object.getScaledHeight(), 1),
    borderRadius: toNumberInput(object.get("rx"), 0),
    opacity: toNumberInput(object.opacity, 1),
    angle: toNumberInput(object.angle, 0),
    fill:
      typeof object.get("fill") === "string" ? String(object.get("fill")) : "",
    stroke:
      typeof object.get("stroke") === "string"
        ? String(object.get("stroke"))
        : supportsImageBorder
          ? "#ffffff"
          : "",
    strokeWidth: toNumberInput(object.get("strokeWidth"), 1),
    text:
      typeof object.get("text") === "string" ? String(object.get("text")) : "",
    fontFamily:
      typeof object.get("fontFamily") === "string"
        ? getPrimaryFontFamilyName(String(object.get("fontFamily")))
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
    letterSpacing: toNumberInput(
      object.get("charSpacing"),
      Number(EMPTY_FORM.letterSpacing),
    ),
    lineHeight: toNumberInput(
      object.get("lineHeight"),
      Number(EMPTY_FORM.lineHeight),
    ),
  };
}

export function normalizeHexColor(value: string, fallback = "#ffffff") {
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

const GOOGLE_FONT_LINK_PREFIX = "editor-google-fonts";
const loadedGoogleFontFamilies = new Set<string>();
let hasGoogleFontPreconnect = false;

/** Builds a Google Fonts CSS query for the requested family names. */
function buildGoogleFontFamilyQuery(fontFamilies: readonly string[]) {
  return fontFamilies
    .map((fontFamily) => {
      const encodedFamily = fontFamily.trim().replace(/\s+/g, "+");
      return `family=${encodedFamily}:wght@400;500;600;700`;
    })
    .join("&");
}

/** Ensures the browser has the requested Google font families available. */
export function ensureGoogleFontsLoaded(fontFamilies: readonly string[] = POPULAR_GOOGLE_FONT_FAMILIES) {
  if (typeof document === "undefined") return;

  const nextFamilies = fontFamilies
    .map((fontFamily) => getPrimaryFontFamilyName(fontFamily))
    .filter((fontFamily) => fontFamily.length > 0)
    .filter((fontFamily) => !loadedGoogleFontFamilies.has(fontFamily));

  if (nextFamilies.length === 0) return;

  if (!hasGoogleFontPreconnect) {
    const preconnectApi = document.createElement("link");
    preconnectApi.rel = "preconnect";
    preconnectApi.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnectApi);

    const preconnectStatic = document.createElement("link");
    preconnectStatic.rel = "preconnect";
    preconnectStatic.href = "https://fonts.gstatic.com";
    preconnectStatic.crossOrigin = "anonymous";
    document.head.appendChild(preconnectStatic);
    hasGoogleFontPreconnect = true;
  }

  const fontLink = document.createElement("link");
  fontLink.id = `${GOOGLE_FONT_LINK_PREFIX}-${loadedGoogleFontFamilies.size}`;
  fontLink.rel = "stylesheet";
  fontLink.href = `https://fonts.googleapis.com/css2?${buildGoogleFontFamilyQuery(nextFamilies)}&display=swap`;
  document.head.appendChild(fontLink);

  nextFamilies.forEach((fontFamily) => {
    loadedGoogleFontFamilies.add(fontFamily);
  });
}

/** Starts the bulk Google Fonts preload after initial UI work has settled. */
export function scheduleGoogleFontsLoad(
  fontFamilies: readonly string[] = POPULAR_GOOGLE_FONT_FAMILIES,
) {
  if (typeof window === "undefined") return;

  const loadFonts = () => {
    ensureGoogleFontsLoaded(fontFamilies);
  };

  if ("requestIdleCallback" in window) {
    const idleCallback = window.requestIdleCallback(loadFonts);
    return () => {
      window.cancelIdleCallback(idleCallback);
    };
  }

  const timeoutId = globalThis.setTimeout(loadFonts, 0);
  return () => {
    globalThis.clearTimeout(timeoutId);
  };
}

import type {
  AnimationTemplate,
  TextAnimationTemplate,
} from "../../../../types";

export const sectionTitleClass =
  "font-[var(--wise-font-display)] text-[14px] font-semibold tracking-[-0.025em] text-[var(--wise-content-primary)]";
export const labelClass =
  "space-y-1 font-[var(--wise-font-ui)] text-[11px] font-medium text-[var(--wise-content-secondary)]";
export const fieldClass =
  "h-6 max-h-6 w-full rounded-[4px] border border-[rgba(141,171,255,0.14)] " +
  "bg-[var(--wise-surface-raised)] px-2.5 font-[var(--wise-font-ui)] text-[11px] text-[var(--wise-content-primary)] " +
  "outline-none transition focus:border-b-[var(--wise-primary)] focus:bg-[rgba(43,42,46,0.98)]";
export const cardClass =
  "space-y-4 pt-4 first:pt-0";

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
