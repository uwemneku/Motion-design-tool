import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_VERY_HIGH,
} from "mediabunny";

export type ExportOptions = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  durationInSeconds: number;
  fps?: number;
  onFrame: (timeInSeconds: number) => void;
  onProgress?: (progress: number) => void;
};

export async function exportCanvasAsMp4(options: ExportOptions): Promise<Blob> {
  const {
    canvas,
    width,
    height,
    durationInSeconds,
    fps = 30,
    onFrame,
    onProgress,
  } = options;

  const output = new Output({
    target: new BufferTarget(),
    format: new Mp4OutputFormat({}),
  });

  const videoCodec = await getFirstEncodableVideoCodec(output.format.getSupportedVideoCodecs(), {
    width,
    height,
  });

  if (!videoCodec) {
    throw new Error("No encodable video codec found for current browser.");
  }

  const source = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: QUALITY_VERY_HIGH,
  });

  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const totalFrames = Math.max(1, Math.floor(durationInSeconds * fps));

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const timestamp = frameIndex / fps;
    onFrame(timestamp);
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
