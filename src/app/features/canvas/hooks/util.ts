export async function validateImageUrl(url: string) {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Image could not be loaded from the provided URL."));
    image.src = url;
  });
}

export function createRegularPolygonPoints(sides: number, radius: number) {
  const safeSides = Math.max(3, Math.round(sides));
  const step = (Math.PI * 2) / safeSides;
  const startAngle = -Math.PI / 2;

  return Array.from({ length: safeSides }, (_, index) => {
    const angle = startAngle + step * index;
    return {
      x: Math.cos(angle) * radius + radius,
      y: Math.sin(angle) * radius + radius,
    };
  });
}
