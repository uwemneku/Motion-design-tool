/** Video Import.Ts canvas video helpers. */
const VIDEO_HOST_ID = "__newMotionVideoHost";

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

/** Wait for initial frame data so Fabric can size the video from real dimensions. */
export function loadVideoElementFromFile(file: File) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanupListeners = () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
    };

    const onLoadedData = () => {
      cleanupListeners();
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      resolve(video);
    };

    const onError = () => {
      cleanupListeners();
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load the selected video."));
    };

    video.preload = "auto";
    video.autoplay = true;
    video.defaultMuted = true;
    video.muted = false;
    video.loop = true;
    video.playsInline = true;
    video.src = objectUrl;
    ensureVideoHost().appendChild(video);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);
    video.load();
  });
}
