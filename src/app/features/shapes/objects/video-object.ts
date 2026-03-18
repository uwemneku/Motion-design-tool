/** Video Object.Ts shape model and behavior. */
import { FabricImage } from "fabric";
import type {
  ColorKeyframesByProperty,
  KeyframesByProperty,
} from "../animatable-object/types";
import { AnimatableObject } from "../animatable-object/object";

export class VideoObject extends AnimatableObject {
  declare fabricObject: FabricImage;

  constructor(
    source: HTMLVideoElement | FabricImage,
    options: ConstructorParameters<typeof FabricImage>[1] = {},
    keyframes: KeyframesByProperty = {},
    colorKeyframes: ColorKeyframesByProperty = {},
  ) {
    // Wrap videos with FabricImage so they behave like other animatable canvas items.
    const fabricObject = source instanceof FabricImage ? source : new FabricImage(source, options);
    super(fabricObject, keyframes, colorKeyframes);
  }

  /** Seeks numeric animation state first, then aligns the backing video element to the same time. */
  seek(time: number) {
    this.seekAnimationState(time);
    void this.syncVideoToTime(time);
  }

  /** Applies the normal animatable property interpolation without waiting on media frame updates. */
  seekAnimationState(time: number) {
    super.seek(time);
  }

  /** Aligns the underlying video element with the editor playhead and resolves after the frame is ready. */
  async syncVideoToTime(timeInSeconds: number) {
    const video = this.getVideoElement();
    if (!video) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const normalizedTime = Math.max(0, Math.min(timeInSeconds, duration));
    if (Math.abs(video.currentTime - normalizedTime) <= 1 / 60) return;

    video.pause();
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        this.fabricObject.dirty = true;
        resolve();
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      video.currentTime = normalizedTime;
    });
  }

  /** Keeps the media element in the right mode for scrubbing versus live playback. */
  syncPlaybackState(isPaused: boolean, timeInSeconds: number) {
    const video = this.getVideoElement();
    if (!video) return;

    if (isPaused) {
      video.pause();
      void this.syncVideoToTime(timeInSeconds);
      return;
    }

    this.seekAnimationState(timeInSeconds);
    video.muted = false;

    const drift = Math.abs(video.currentTime - timeInSeconds);
    if (drift > 0.12) {
      video.currentTime = Math.max(0, Math.min(timeInSeconds, video.duration || timeInSeconds));
    }

    if (video.paused) {
      void video.play().catch(() => {
        // Browsers may still block audio playback if the gesture chain is interrupted.
      });
    }
  }

  /** Returns the live HTML video element that backs this Fabric object. */
  private getVideoElement() {
    const element = this.fabricObject.getElement();
    return element instanceof HTMLVideoElement ? element : null;
  }
}
