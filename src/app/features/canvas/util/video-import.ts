/** Video Import.Ts canvas video helpers. */
const VIDEO_HOST_ID = "__newMotionVideoHost";
const ORIGINAL_VIDEO_SOURCE_DATA_KEY = "originalSource";

type VideoLoadSource = File | HTMLVideoElement | string;

type VideoLoadOptions = {
  onLoadedData?: (video: HTMLVideoElement) => void;
  onLoadError?: () => void;
};

function ensureVideoHost() {
  let host = document.getElementById(VIDEO_HOST_ID);
  if (host) return host;

  host = document.createElement("div");
  host.id = VIDEO_HOST_ID;
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = "1px";
  host.style.height = "1px";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  host.style.overflow = "hidden";
  document.body.appendChild(host);
  return host;
}

/** Creates a hidden video element from a file, url, or existing video element. */
export function loadVideoElement(
  source: VideoLoadSource,
  options: VideoLoadOptions = {},
) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const sourceUrl =
      source instanceof HTMLVideoElement
        ? source.dataset[ORIGINAL_VIDEO_SOURCE_DATA_KEY] || source.currentSrc || source.src
        : source instanceof File
          ? URL.createObjectURL(source)
          : source;

    if (!sourceUrl) {
      reject(new Error("Could not load the selected video."));
      return;
    }

    const video = document.createElement("video");

    const cleanupListeners = () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
    };

    const onLoadedData = () => {
      cleanupListeners();
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      options.onLoadedData?.(video);
      resolve(video);
    };

    const onError = () => {
      cleanupListeners();
      if (source instanceof File) {
        URL.revokeObjectURL(sourceUrl);
      }
      options.onLoadError?.();
      reject(
        new Error(
          source instanceof HTMLVideoElement
            ? "Could not clone the selected video."
            : "Could not load the selected video.",
        ),
      );
    };

    video.preload = source instanceof HTMLVideoElement ? source.preload || "auto" : "auto";
    video.autoplay = source instanceof File;
    video.defaultMuted = source instanceof HTMLVideoElement ? source.defaultMuted : true;
    video.muted = source instanceof HTMLVideoElement ? source.muted : false;
    video.loop = source instanceof HTMLVideoElement ? source.loop : true;
    video.playsInline = source instanceof HTMLVideoElement ? source.playsInline : true;
    video.crossOrigin = source instanceof HTMLVideoElement ? source.crossOrigin : null;
    video.dataset[ORIGINAL_VIDEO_SOURCE_DATA_KEY] = sourceUrl;
    video.src = sourceUrl;
    ensureVideoHost().appendChild(video);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);
    video.load();
  });
}
