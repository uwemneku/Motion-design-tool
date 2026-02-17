import type { Textbox } from "fabric";
import type {
  AnimationTemplateId,
  TextAnimationTemplateId,
} from "./canvas-side-panel.types";

const textMeasureCanvas =
  typeof document !== "undefined" ? document.createElement("canvas") : null;
const textMeasureContext = textMeasureCanvas?.getContext("2d") ?? null;

export function createCustomId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createKeyframeMarkerId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
}

function getTextFontString(text: Textbox) {
  const fontStyle = text.fontStyle ?? "normal";
  const fontWeight = text.fontWeight ?? "normal";
  const fontSize = text.fontSize ?? 24;
  const fontFamily = text.fontFamily ?? "ui-sans-serif";
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
}

export function measureCharAdvance(character: string, sourceText: Textbox) {
  if (!textMeasureContext) {
    return (sourceText.fontSize ?? 24) * 0.6;
  }
  textMeasureContext.font = getTextFontString(sourceText);
  const metrics = textMeasureContext.measureText(character || " ");
  return Math.max(0, metrics.width);
}

export function getPreviewShapeClass(templateId: AnimationTemplateId) {
  if (templateId === "fade_in") {
    return "group-hover:[animation:preview-fade-in_0.9s_ease-out_1]";
  }
  if (templateId === "fade_out") {
    return "group-hover:[animation:preview-fade-out_0.9s_ease-out_1]";
  }
  if (templateId === "zoom_in") {
    return "group-hover:[animation:preview-zoom-in_0.9s_ease-out_1]";
  }
  if (templateId === "text_pop_in") {
    return "group-hover:[animation:preview-text-pop_0.8s_ease-out_1]";
  }
  if (templateId === "text_flicker") {
    return "group-hover:[animation:preview-text-flicker_0.8s_steps(2,end)_1]";
  }
  if (templateId === "text_wiggle") {
    return "group-hover:[animation:preview-text-wiggle_0.8s_ease-in-out_1]";
  }
  return "group-hover:[animation:preview-zoom-out_0.9s_ease-out_1]";
}

export function getTextPreviewShapeClass(templateId: TextAnimationTemplateId) {
  if (templateId === "text_chars_rise") {
    return "group-hover:[animation:preview-text-char-rise_0.9s_ease-out_1]";
  }
  return "";
}

export function appendUniqueMarkerTimes(
  markers: Array<{ id: string; timestamp: number }>,
  markerTimes: number[],
  epsilon: number,
) {
  const nextMarkers = [...markers];
  markerTimes.forEach((timestamp) => {
    const hasMarker = nextMarkers.some(
      (marker) => Math.abs(marker.timestamp - timestamp) <= epsilon,
    );
    if (!hasMarker) {
      nextMarkers.push({
        id: createKeyframeMarkerId(),
        timestamp,
      });
    }
  });
  return nextMarkers.sort((a, b) => a.timestamp - b.timestamp);
}
