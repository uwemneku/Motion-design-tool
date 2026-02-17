export const VIDEO_WORK_AREA_DEFAULT_ASPECT_RATIO = 16 / 9;
export const VIDEO_WORK_AREA_MAX_WIDTH_RATIO = 0.92;
export const VIDEO_WORK_AREA_MAX_HEIGHT_RATIO = 0.8;

export type VideoWorkAreaRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getVideoWorkAreaRect(
  containerWidth: number,
  containerHeight: number,
  aspectRatio = VIDEO_WORK_AREA_DEFAULT_ASPECT_RATIO,
): VideoWorkAreaRect {
  const maxWidth = containerWidth * VIDEO_WORK_AREA_MAX_WIDTH_RATIO;
  const maxHeight = containerHeight * VIDEO_WORK_AREA_MAX_HEIGHT_RATIO;

  const width = Math.min(maxWidth, maxHeight * aspectRatio);
  const height = width / aspectRatio;

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}
