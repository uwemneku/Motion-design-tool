export type AnimationTemplateId =
  | "fade_in"
  | "fade_out"
  | "zoom_in"
  | "zoom_out"
  | "text_pop_in"
  | "text_flicker"
  | "text_wiggle";

export type TextAnimationTemplateId = "text_chars_rise";

export type AnimationTemplate = {
  id: AnimationTemplateId;
  name: string;
  description: string;
  duration: number;
};

export type TextAnimationTemplate = {
  id: TextAnimationTemplateId;
  name: string;
  description: string;
  duration: number;
};

export type DesignFormState = {
  left: string;
  top: string;
  scaleX: string;
  scaleY: string;
  opacity: string;
  angle: string;
  fill: string;
  stroke: string;
  text: string;
  fontFamily: string;
  fontSize: string;
  fontStyle: string;
  fontWeight: string;
};
