/** Video Object.Ts shape model and behavior. */
import { FabricImage } from "fabric";
import { loadVideoElement } from "../../canvas/util/video-import";
import type {
  ColorKeyframesByProperty,
  KeyframesByProperty,
  PathKeyframesByProperty,
  TextKeyframesByProperty,
} from "../animatable-object/types";
import {
  AnimatableObject,
  cloneAnimatableColorKeyframes,
  cloneAnimatableNumericKeyframes,
  cloneAnimatablePathKeyframes,
  cloneAnimatableTextKeyframes,
} from "../animatable-object/object";

export class VideoObject extends AnimatableObject {
  override fabricObject: FabricImage;

  constructor(
    source: HTMLVideoElement | FabricImage,
    options: ConstructorParameters<typeof FabricImage>[1] = {},
    keyframes: KeyframesByProperty = {},
    colorKeyframes: ColorKeyframesByProperty = {},
    pathKeyframes: PathKeyframesByProperty = {},
    textKeyframes: TextKeyframesByProperty = {},
  ) {
    // Wrap videos with FabricImage so they behave like other animatable canvas items.
    const fabricObject = source instanceof FabricImage ? source : new FabricImage(source, options);
    super(fabricObject, keyframes, colorKeyframes, pathKeyframes, textKeyframes);
    this.fabricObject = fabricObject;
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

  /** Clones the video object with a dedicated media element and fresh animation ids. */
  override async clone(positionOffset: { left: number; top: number } = { left: 0, top: 0 }) {
    const sourceVideo = this.getVideoElement();
    if (!sourceVideo) {
      const clonedFallbackObject = await this.fabricObject.clone();
      return new VideoObject(
        clonedFallbackObject,
        {},
        cloneAnimatableNumericKeyframes(this.keyframes, positionOffset),
        cloneAnimatableColorKeyframes(this.colorKeyframes),
        cloneAnimatablePathKeyframes(this.pathKeyframes),
        cloneAnimatableTextKeyframes(this.textKeyframes),
      );
    }

    const clonedVideo = await loadVideoElement(sourceVideo, {
      onLoadedData: (video) => {
        video.currentTime = Math.max(0, sourceVideo.currentTime || 0);
      },
    });
    const clonedObject = new FabricImage(
      clonedVideo,
      this.getCloneOptions(positionOffset, clonedVideo),
    );

    return new VideoObject(
      clonedObject,
      {},
      cloneAnimatableNumericKeyframes(this.keyframes, positionOffset),
      cloneAnimatableColorKeyframes(this.colorKeyframes),
      cloneAnimatablePathKeyframes(this.pathKeyframes),
      cloneAnimatableTextKeyframes(this.textKeyframes),
    );
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

  /** Rebuilds the Fabric image options needed for a pasted video clone. */
  private getCloneOptions(
    positionOffset: { left: number; top: number },
    clonedVideo: HTMLVideoElement,
  ) {
    return {
      left: (this.fabricObject.left ?? 0) + positionOffset.left,
      top: (this.fabricObject.top ?? 0) + positionOffset.top,
      originX: this.fabricObject.originX,
      originY: this.fabricObject.originY,
      width: this.fabricObject.width ?? clonedVideo.videoWidth,
      height: this.fabricObject.height ?? clonedVideo.videoHeight,
      scaleX: this.fabricObject.scaleX,
      scaleY: this.fabricObject.scaleY,
      angle: this.fabricObject.angle,
      opacity: this.fabricObject.opacity,
      flipX: this.fabricObject.flipX,
      flipY: this.fabricObject.flipY,
      skewX: this.fabricObject.skewX,
      skewY: this.fabricObject.skewY,
      stroke: this.fabricObject.stroke,
      strokeWidth: this.fabricObject.strokeWidth,
      strokeUniform: this.fabricObject.strokeUniform,
      objectCaching: false,
    };
  }
}
