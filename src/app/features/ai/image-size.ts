/** Image size helpers for AI-generated/loaded assets. */

const IMAGE_FORMATS = ['image/webp', 'image/jpeg'] as const;

async function blobFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load image (${response.status}).`);
  }
  return response.blob();
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode image for compression.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: (typeof IMAGE_FORMATS)[number],
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Returns a data URL guaranteed to be <= maxBytes by progressively downscaling/re-encoding.
 */
export async function compressImageUrlToMaxBytes(url: string, maxBytes: number) {
  const sourceBlob = await blobFromUrl(url);
  if (sourceBlob.size <= maxBytes) {
    return url;
  }

  const sourceImage = await loadImage(sourceBlob);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize image compression context.');
  }

  let bestBlob: Blob | null = null;
  const scales = [1, 0.85, 0.7, 0.55, 0.45, 0.35, 0.25];
  const qualities = [0.92, 0.82, 0.72, 0.62, 0.52, 0.42, 0.32];

  for (const scale of scales) {
    const targetWidth = Math.max(1, Math.round(sourceImage.width * scale));
    const targetHeight = Math.max(1, Math.round(sourceImage.height * scale));
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    for (const format of IMAGE_FORMATS) {
      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, format, quality);
        if (!blob) continue;
        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }
        if (blob.size <= maxBytes) {
          return URL.createObjectURL(blob);
        }
      }
    }
  }

  if (bestBlob) {
    throw new Error(
      `Image exceeds 500KB after compression (best ${(bestBlob.size / 1024).toFixed(1)}KB).`,
    );
  }
  throw new Error('Image compression failed.');
}
