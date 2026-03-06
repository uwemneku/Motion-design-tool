/** Export Media.Ts media export utilities. */
import {
  BufferTarget,
  canEncodeVideo,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_VERY_HIGH,
  WebMOutputFormat,
} from "mediabunny";

export type ExportVideoFormat = "mp4" | "webm";

export type ExportOptions = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  durationInSeconds: number;
  format: ExportVideoFormat;
  fps?: number;
  onFrame: (timeInSeconds: number) => void | Promise<void>;
  onProgress?: (progress: number) => void;
};

/** Encodes the rendered canvas frames into the selected video container. */
export async function exportCanvasAsVideo(
  options: ExportOptions,
): Promise<Blob> {
  const {
    canvas,
    width,
    height,
    durationInSeconds,
    format,
    fps = 60,
    onFrame,
    onProgress,
  } = options;

  const output = new Output({
    target: new BufferTarget(),
    format: createOutputFormat(format),
  });

  const videoCodec = await getExportVideoCodec(format, output, width, height);

  if (!videoCodec) {
    throw new Error(
      format === "webm"
        ? "No alpha-capable WebM video codec found for current browser."
        : "No encodable video codec found for current browser.",
    );
  }

  const source = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: QUALITY_VERY_HIGH,
    alpha: format === "webm" ? "keep" : "discard",
  });

  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const totalFrames = Math.max(1, Math.floor(durationInSeconds * fps));

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const timestamp = frameIndex / fps;
    await onFrame(timestamp);

    await source.add(timestamp, 1 / fps);
    onProgress?.((frameIndex + 1) / totalFrames);
  }

  source.close();
  await output.finalize();

  if (!output.target.buffer) {
    throw new Error("Video buffer was empty after export.");
  }

  return new Blob([output.target.buffer], { type: output.format.mimeType });
}

/** Creates the MediaBunny container format for the requested export type. */
function createOutputFormat(format: ExportVideoFormat) {
  if (format === "webm") {
    return new WebMOutputFormat({});
  }

  return new Mp4OutputFormat({});
}

/** Picks a browser-supported codec for the selected format, preserving alpha for WebM. */
async function getExportVideoCodec(
  format: ExportVideoFormat,
  output: Output,
  width: number,
  height: number,
) {
  const supportedCodecs = output.format.getSupportedVideoCodecs();

  if (format === "webm") {
    for (const codec of supportedCodecs) {
      const canEncodeWithAlpha = await canEncodeVideo(codec, {
        alpha: "keep",
        width,
        height,
      });
      if (canEncodeWithAlpha) {
        return codec;
      }
    }

    return null;
  }

  return getFirstEncodableVideoCodec(supportedCodecs, {
    width,
    height,
  });
}
