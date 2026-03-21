/** Use Export Video.Ts media export utilities. */
import {
  FabricImage,
  FabricObject,
  Path,
  StaticCanvas,
  type Canvas,
  type ObjectEvents,
  type SerializedObjectProps,
  type TFabricObjectProps,
} from "fabric";
import { useCallback, useState, type MutableRefObject } from "react";
import { EXPORT_DURATION_SECONDS, EXPORT_FPS, EXPORT_PIXEL_DENSITY } from "../../../const";
import { getVideoWorkAreaRect } from "./video-work-area";
import { AnimatableObject, cloneAnimatablePathKeyframes } from "../shapes/animatable-object/object";
import { VideoObject } from "../shapes/objects";
import { useCanvasAppContext } from "../canvas/hooks/use-canvas-app-context";
import { exportCanvasAsVideo, type ExportVideoFormat } from "./export-media";
import type { KeyframesByProperty } from "../shapes/animatable-object/types";
import { toast } from "sonner";

type ExportMaskTrackingObject = FabricObject & {
  __maskProxyObject?: FabricObject;
  __maskSourceObject?: FabricObject;
  isVideoAreaGuide?: boolean;
};

/**
 * Exports the current canvas scene to the selected format using the video work area.
 */
function useExportVideo(fabricCanvas: MutableRefObject<Canvas | null>, activeAspectRatio: number) {
  const { instancesRef } = useCanvasAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportVideo = useCallback(
    async (quality: number, format: ExportVideoFormat) => {
      const liveCanvas = fabricCanvas.current;
      if (!liveCanvas) return;
      liveCanvas.discardActiveObject();
      liveCanvas.requestRenderAll();

      const exportScale = Math.max(0.5, Math.min(5, quality)) * EXPORT_PIXEL_DENSITY;
      let exportCanvas: StaticCanvas | null = null;

      setIsExporting(true);
      setExportProgress(0);

      try {
        const liveWidth = liveCanvas.getWidth();
        const liveHeight = liveCanvas.getHeight();
        const videoArea = getVideoWorkAreaRect(liveWidth, liveHeight, activeAspectRatio);
        const exportWidth = Math.max(2, Math.round(videoArea.width * exportScale));
        const exportHeight = Math.max(2, Math.round(videoArea.height * exportScale));
        const scaleX = exportWidth / videoArea.width;
        const scaleY = exportHeight / videoArea.height;

        const exportElement = document.createElement("canvas");
        exportElement.width = exportWidth;
        exportElement.height = exportHeight;
        ensureTransparentCanvasFrame(exportElement, exportWidth, exportHeight);
        exportCanvas = new StaticCanvas(exportElement, {
          width: exportWidth,
          height: exportHeight,
          backgroundColor: "rgba(0,0,0,0)",
          renderOnAddRemove: false,
        });
        exportCanvas.backgroundImage = undefined;
        exportCanvas.overlayImage = undefined;

        const sourceObjects = liveCanvas.getObjects();
        const exportAudioBuffer = await buildMixedVideoAudioTrack(
          sourceObjects,
          EXPORT_DURATION_SECONDS,
        );
        /**Store the instance of the fabric object from the live canvas */
        const sourceObjectsById = new Map<string, FabricObject>();
        /**Store the animatable object created from the cloned instance of a fabric object in the live canvas for export */
        const exportInstances = new Map<string, AnimatableObject | VideoObject>();
        const exportVideoInstances: VideoObject[] = [];

        for (const sourceObject of sourceObjects) {
          const customId = sourceObject.customId;
          if (isVideoAreaGuideObject(sourceObject)) {
            continue;
          }

          const clonedObject = await cloneFabricObjectWithCustomId(sourceObject);
          const sourceLeft = sourceObject.left ?? 0;
          const sourceTop = sourceObject.top ?? 0;
          const sourceScaleX = sourceObject.scaleX ?? 1;
          const sourceScaleY = sourceObject.scaleY ?? 1;

          clonedObject.set({
            left: (sourceLeft - videoArea.left) * scaleX,
            top: (sourceTop - videoArea.top) * scaleY,
            scaleX: sourceScaleX * scaleX,
            scaleY: sourceScaleY * scaleY,
          });
          clonedObject.setCoords();
          exportCanvas.add(clonedObject);

          if (customId) {
            sourceObjectsById.set(customId, sourceObject);
            const sourceInstance = instancesRef.current.get(customId);
            if (sourceInstance) {
              const exportKeyframes = cloneKeyframesForExport(
                sourceInstance.keyframes,
                videoArea.left,
                videoArea.top,
                scaleX,
                scaleY,
              );
              const exportColorKeyframes = {
                fill: sourceInstance.colorKeyframes.fill?.map((keyframe) => ({
                  ...keyframe,
                })),
                stroke: sourceInstance.colorKeyframes.stroke?.map((keyframe) => ({
                  ...keyframe,
                })),
              };
              const exportPathKeyframes = cloneAnimatablePathKeyframes(
                sourceInstance.pathKeyframes,
              );
              const exportInstance = createExportAnimatableObject(
                clonedObject,
                exportKeyframes,
                exportColorKeyframes,
                exportPathKeyframes,
              );
              exportInstances.set(customId, exportInstance);
              if (exportInstance instanceof VideoObject) {
                exportVideoInstances.push(exportInstance);
              }
            }
          }
        }

        await remapExportClipPaths(
          sourceObjectsById,
          exportInstances,
          videoArea.left,
          videoArea.top,
          scaleX,
          scaleY,
        );
        ensureTransparentCanvasFrame(exportElement, exportWidth, exportHeight);
        exportCanvas.renderAll();

        const blob = await exportCanvasAsVideo({
          audioBuffer: exportAudioBuffer,
          canvas: exportElement,
          width: exportWidth,
          height: exportHeight,
          durationInSeconds: EXPORT_DURATION_SECONDS,
          format,
          fps: EXPORT_FPS,
          onFrame: async (timeInSeconds) => {
            exportInstances.forEach((instance) => {
              if (instance instanceof VideoObject) {
                instance.seekAnimationState(timeInSeconds);
              } else {
                instance.seek(timeInSeconds);
              }
              syncExportMaskProxyForObject(instance.fabricObject);
            });
            await Promise.all(
              exportVideoInstances.map((instance) => instance.syncVideoToTime(timeInSeconds)),
            );
            ensureTransparentCanvasFrame(exportElement, exportWidth, exportHeight);
            exportCanvas?.renderAll();
          },
          onProgress: (progress) => {
            setExportProgress(progress);
          },
        });

        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        // const anchor = document.createElement("a");
        // const timestamp = new Date().toISOString().replaceAll(":", "-");
        // anchor.href = url;
        // anchor.download = `motion-export-${timestamp}.${format}`;
        // anchor.click();
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60_000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown export error";
        toast.error(`Export failed: ${message}`);
      } finally {
        setIsExporting(false);
        setExportProgress(0);
        exportCanvas?.dispose();
      }
    },
    [activeAspectRatio, fabricCanvas, instancesRef],
  );

  return [{ isExporting, exportProgress }, exportVideo] as const;
}

export default useExportVideo;

/** Clears the export surface so every rendered frame starts from transparent pixels. */
function ensureTransparentCanvasFrame(canvas: HTMLCanvasElement, width: number, height: number) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;
  context.clearRect(0, 0, width, height);
}

function isVideoAreaGuideObject(object: FabricObject) {
  return Boolean((object as ExportMaskTrackingObject).isVideoAreaGuide);
}

/**
 * Clones and scales keyframes from live-canvas coordinates into export space.
 */
function cloneKeyframesForExport(
  keyframes: KeyframesByProperty,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number,
): KeyframesByProperty {
  const next: KeyframesByProperty = {};

  for (const [property, propertyKeyframes] of Object.entries(keyframes) as Array<
    [keyof KeyframesByProperty, KeyframesByProperty[keyof KeyframesByProperty]]
  >) {
    if (!propertyKeyframes) continue;

    next[property] = propertyKeyframes.map((keyframe) => {
      let value = keyframe.value;

      if (keyframe.property === "left") {
        value = (keyframe.value - offsetX) * scaleX;
      } else if (keyframe.property === "top") {
        value = (keyframe.value - offsetY) * scaleY;
      } else if (keyframe.property === "width") {
        value = keyframe.value * scaleX;
      } else if (keyframe.property === "height") {
        value = keyframe.value * scaleY;
      }

      return {
        ...keyframe,
        value,
      };
    });
  }

  return next;
}

/**
 * Creates a canvas snapshot for image-backed Fabric objects when clone fails.
 */
function cloneImageElementToCanvas(sourceObject: FabricImage): HTMLCanvasElement {
  const element = sourceObject.getElement();
  const isImageElement = element instanceof HTMLImageElement;
  const isCanvasElement = element instanceof HTMLCanvasElement;

  const width = isImageElement
    ? element.naturalWidth || element.width
    : isCanvasElement
      ? element.width
      : (sourceObject.width ?? 1);
  const height = isImageElement
    ? element.naturalHeight || element.height
    : isCanvasElement
      ? element.height
      : (sourceObject.height ?? 1);

  const snapshotCanvas = document.createElement("canvas");
  snapshotCanvas.width = Math.max(1, Math.round(width));
  snapshotCanvas.height = Math.max(1, Math.round(height));
  const context = snapshotCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create 2d context for image export clone.");
  }
  context.drawImage(element as CanvasImageSource, 0, 0);
  return snapshotCanvas;
}

/**
 * Clones a Fabric object and preserves `customId` metadata.
 */
async function cloneFabricObjectWithCustomId<
  Props extends TFabricObjectProps = TFabricObjectProps,
  SProps extends SerializedObjectProps = SerializedObjectProps,
  EventSpec extends ObjectEvents = ObjectEvents,
>(sourceObject: FabricObject<Props, SProps, EventSpec>) {
  let clonedObject: FabricObject<Props, SProps, EventSpec>;
  if (sourceObject instanceof FabricImage) {
    const sourceElement = sourceObject.getElement();
    if (sourceElement instanceof HTMLVideoElement) {
      clonedObject = (await cloneVideoFabricObject(sourceObject, sourceElement)) as FabricObject<
        Props,
        SProps,
        EventSpec
      >;
    } else {
      try {
        clonedObject = await sourceObject.clone();
      } catch {
        const snapshotCanvas = cloneImageElementToCanvas(sourceObject);
        clonedObject = new FabricImage(snapshotCanvas, sourceObject.toObject()) as FabricObject<
          Props,
          SProps,
          EventSpec
        >;
      }
    }
  } else {
    clonedObject = await sourceObject.clone();
  }

  const customId = sourceObject.customId;
  if (customId) {
    clonedObject.customId = customId;
    clonedObject.set("customId", customId);
  }
  if (clonedObject instanceof Path) {
    clonedObject.set({
      objectCaching: false,
    });
  }
  return clonedObject;
}

/** Creates the right animatable wrapper for exported objects, including live video-backed layers. */
function createExportAnimatableObject(
  object: FabricObject,
  keyframes: KeyframesByProperty,
  colorKeyframes: AnimatableObject["colorKeyframes"],
  pathKeyframes: AnimatableObject["pathKeyframes"],
) {
  if (object instanceof Path) {
    object.set({
      objectCaching: false,
    });
  }

  if (object instanceof FabricImage && object.getElement() instanceof HTMLVideoElement) {
    return new VideoObject(object, {}, keyframes, colorKeyframes, pathKeyframes);
  }

  return new AnimatableObject(object, keyframes, colorKeyframes, pathKeyframes);
}

/** Builds a separate export-only video element so export seeking does not disturb the editor preview. */
async function cloneVideoFabricObject(sourceObject: FabricImage, sourceVideo: HTMLVideoElement) {
  const video = document.createElement("video");
  video.preload = "auto";
  video.defaultMuted = true;
  video.muted = true;
  video.loop = sourceVideo.loop;
  video.playsInline = true;
  video.src = sourceVideo.currentSrc || sourceVideo.src;

  await new Promise<void>((resolve, reject) => {
    const onLoadedData = () => {
      cleanup();
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Could not clone video for export."));
    };

    const cleanup = () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
    };

    if (video.readyState >= 2) {
      onLoadedData();
      return;
    }

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);
    video.load();
  });

  const cloneOptions = {
    angle: sourceObject.angle,
    cropX: sourceObject.cropX,
    cropY: sourceObject.cropY,
    flipX: sourceObject.flipX,
    flipY: sourceObject.flipY,
    height: video.videoHeight,
    left: sourceObject.left,
    objectCaching: false,
    opacity: sourceObject.opacity,
    originX: sourceObject.originX,
    originY: sourceObject.originY,
    scaleX: sourceObject.scaleX,
    scaleY: sourceObject.scaleY,
    skewX: sourceObject.skewX,
    skewY: sourceObject.skewY,
    stroke: sourceObject.stroke,
    strokeUniform: sourceObject.strokeUniform,
    strokeWidth: sourceObject.strokeWidth,
    top: sourceObject.top,
    visible: sourceObject.visible,
    width: video.videoWidth,
  } satisfies ConstructorParameters<typeof FabricImage>[1];

  return new FabricImage(video, {
    ...cloneOptions,
  });
}

/**
 * Rebinds clip paths in the export canvas so masking behavior stays consistent.
 */
async function remapExportClipPaths(
  sourceObjectsById: Map<string, FabricObject>,
  exportObjectsById: Map<string, AnimatableObject>,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number,
) {
  // Rebind clip paths on export clones so mask behavior matches the live canvas.
  for (const [sourceId, sourceObject] of sourceObjectsById.entries()) {
    const sourceClipPath = sourceObject.clipPath;
    if (!sourceClipPath) continue;

    const clipPathCustomIdId =
      "customId" in sourceClipPath && typeof sourceClipPath.customId === "string"
        ? sourceClipPath.customId
        : null;
    const exportObject = exportObjectsById.get(sourceId)?.fabricObject;
    if (!exportObject) continue;

    let exportClipPath: FabricObject | undefined;
    let exportMaskSourceForSync: FabricObject | undefined;
    if (clipPathCustomIdId) {
      const exportMaskSource = exportObjectsById.get(clipPathCustomIdId)?.fabricObject;
      if (exportMaskSource) {
        // Use a dedicated clip-path clone so the visible source object is not reused as mask.
        exportClipPath = await cloneFabricObjectWithCustomId(exportMaskSource);
        exportMaskSourceForSync = exportMaskSource;
        configureExportMaskProxy(exportClipPath);
        exportClipPath.set({
          left: exportMaskSource.left,
          top: exportMaskSource.top,
          scaleX: exportMaskSource.scaleX,
          scaleY: exportMaskSource.scaleY,
          angle: exportMaskSource.angle,
          skewX: exportMaskSource.skewX,
          skewY: exportMaskSource.skewY,
          flipX: exportMaskSource.flipX,
          flipY: exportMaskSource.flipY,
          originX: exportMaskSource.originX,
          originY: exportMaskSource.originY,
          visible: false,
          evented: false,
        });
        if (exportClipPath instanceof Path && exportMaskSource instanceof Path) {
          exportClipPath.set({
            isClosedPath: exportMaskSource.isClosedPath,
            objectCaching: false,
            path: exportMaskSource.path.map((command) => [...command]),
            dirty: true,
          });
          exportClipPath.setDimensions();
        }
        exportClipPath.setCoords();
      }
    }
    if (!exportClipPath) {
      exportClipPath = await cloneFabricObjectWithCustomId(
        sourceClipPath as unknown as FabricObject,
      );
      configureExportMaskProxy(exportClipPath);
      const sourceLeft = sourceClipPath.left ?? 0;
      const sourceTop = sourceClipPath.top ?? 0;
      const sourceScaleX = sourceClipPath.scaleX ?? 1;
      const sourceScaleY = sourceClipPath.scaleY ?? 1;
      exportClipPath.set({
        left: (sourceLeft - offsetX) * scaleX,
        top: (sourceTop - offsetY) * scaleY,
        scaleX: sourceScaleX * scaleX,
        scaleY: sourceScaleY * scaleY,
        visible: false,
        evented: false,
      });
      exportClipPath.setCoords();
    }

    exportClipPath.set("absolutePositioned", Boolean(sourceClipPath.absolutePositioned));
    exportObject.set("clipPath", exportClipPath);
    setExportMaskTracking(exportObject, exportClipPath, exportMaskSourceForSync);
    exportObject.setCoords();
  }
}

/**
 * Stores mask-proxy references used during per-frame export sync.
 */
function setExportMaskTracking(
  targetObject: FabricObject,
  maskProxyObject: FabricObject,
  maskSourceObject?: FabricObject,
) {
  // Store mask references so export frame rendering can sync animated mask transforms.
  const trackingObject = targetObject as ExportMaskTrackingObject;
  trackingObject.__maskProxyObject = maskProxyObject;
  trackingObject.__maskSourceObject = maskSourceObject;
}

/**
 * Syncs clip-path proxy transforms from their source objects for each frame.
 */
function syncExportMaskProxyForObject(targetObject: FabricObject) {
  // Keep exported clip-path proxies aligned with their animated source objects.
  const trackingObject = targetObject as ExportMaskTrackingObject;
  const maskProxy = trackingObject.__maskProxyObject;
  const maskSource = trackingObject.__maskSourceObject;
  if (!maskProxy || !maskSource) return;

  maskProxy.set({
    left: maskSource.left,
    top: maskSource.top,
    scaleX: maskSource.scaleX,
    scaleY: maskSource.scaleY,
    angle: maskSource.angle,
    skewX: maskSource.skewX,
    skewY: maskSource.skewY,
    flipX: maskSource.flipX,
    flipY: maskSource.flipY,
    originX: maskSource.originX,
    originY: maskSource.originY,
  });
  if (maskProxy instanceof Path && maskSource instanceof Path) {
    maskProxy.set({
      isClosedPath: maskSource.isClosedPath,
      objectCaching: false,
      path: maskSource.path.map((command) => [...command]),
      dirty: true,
    });
    maskProxy.setDimensions();
  }
  configureExportMaskProxy(maskProxy);
  if (targetObject.clipPath !== maskProxy) {
    targetObject.set("clipPath", maskProxy);
  }
  maskProxy.setCoords();
}

function configureExportMaskProxy(maskProxy: FabricObject) {
  maskProxy.set({
    fill: "#000000",
    objectCaching: false,
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    shadow: null,
  });
}

/** Mixes audio from imported video layers into one offline buffer aligned to the global timeline. */
async function buildMixedVideoAudioTrack(sourceObjects: FabricObject[], durationInSeconds: number) {
  const sourceUrls = sourceObjects.flatMap((object) => {
    if (!(object instanceof FabricImage)) return [];
    const element = object.getElement();
    if (!(element instanceof HTMLVideoElement)) return [];
    const sourceUrl = element.currentSrc || element.src;
    if (!sourceUrl) return [];
    return [sourceUrl];
  });

  if (sourceUrls.length === 0) return null;

  const audioContext = new AudioContext();

  try {
    const decodedBuffers = await Promise.all(
      sourceUrls.map(async (sourceUrl) => {
        try {
          const response = await fetch(sourceUrl);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          return await audioContext.decodeAudioData(arrayBuffer);
        } catch {
          return null;
        }
      }),
    );
    const audioBuffers = decodedBuffers.filter((buffer): buffer is AudioBuffer => Boolean(buffer));
    if (audioBuffers.length === 0) return null;

    const maxChannels = Math.max(...audioBuffers.map((buffer) => buffer.numberOfChannels));
    const sampleRate = audioBuffers[0].sampleRate;
    const offlineContext = new OfflineAudioContext(
      maxChannels,
      Math.ceil(durationInSeconds * sampleRate),
      sampleRate,
    );

    audioBuffers.forEach((buffer) => {
      const sourceNode = offlineContext.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(offlineContext.destination);
      sourceNode.start(0);
    });

    return await offlineContext.startRendering();
  } finally {
    await audioContext.close();
  }
}
