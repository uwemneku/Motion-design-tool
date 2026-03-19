/** Index.Ts module implementation. */
export type AnimationTemplateId =
  | "fade_in"
  | "fade_out"
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
  width: string;
  height: string;
  borderRadius: string;
  opacity: string;
  angle: string;
  fill: string;
  stroke: string;
  strokeWidth: string;
  text: string;
  fontFamily: string;
  fontSize: string;
  fontStyle: string;
  fontWeight: string;
  letterSpacing: string;
  lineHeight: string;
};
