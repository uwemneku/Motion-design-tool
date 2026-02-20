/** Video Work Area Overlay.Tsx module implementation. */
import { Point, Rect, util, type Canvas, type FabricObject } from 'fabric';
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { FIGMA_BLUE } from '../../../const';
import {
  getVideoWorkAreaRect,
  type VideoWorkAreaRect,
} from '../export/video-work-area';

type AspectOption = {
  label: string;
  ratio: number;
};

type VideoWorkAreaOverlayProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  aspectRatio: number;
  aspectLabel: string;
  aspectOptions: AspectOption[];
  onSelectAspectRatio: (nextRatio: number) => void;
};

type VideoGuideObject = FabricObject & {
  isVideoAreaGuide?: boolean;
};

type VideoGuideSet = {
  border: Rect;
  dimBottom: Rect;
  dimLeft: Rect;
  dimRight: Rect;
  dimTop: Rect;
};

function isVideoGuideObject(object?: FabricObject | null): object is VideoGuideObject {
  return Boolean((object as VideoGuideObject | null)?.isVideoAreaGuide);
}

function createVideoGuideRect(options: ConstructorParameters<typeof Rect>[0]) {
  const rect = new Rect({
    evented: false,
    excludeFromExport: true,
    hasBorders: false,
    hasControls: false,
    hoverCursor: 'default',
    lockMovementX: true,
    lockMovementY: true,
    objectCaching: false,
    originX: 'left',
    originY: 'top',
    selectable: false,
    ...options,
  });
  (rect as VideoGuideObject).isVideoAreaGuide = true;
  rect.set('isVideoAreaGuide', true);
  return rect;
}

function computeVideoAreaLabelPosition(
  canvas: Canvas,
  rect: VideoWorkAreaRect,
) {
  const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const topLeft = util.transformPoint(new Point(rect.left, rect.top), transform);
  return {
    left: topLeft.x,
    top: topLeft.y - 24,
  };
}

function updateGuideObjects(
  canvas: Canvas,
  guides: VideoGuideSet,
  rect: VideoWorkAreaRect,
) {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();

  guides.dimTop.set({
    height: Math.max(0, rect.top),
    left: 0,
    top: 0,
    width: canvasWidth,
  });
  guides.dimBottom.set({
    height: Math.max(0, canvasHeight - (rect.top + rect.height)),
    left: 0,
    top: rect.top + rect.height,
    width: canvasWidth,
  });
  guides.dimLeft.set({
    height: rect.height,
    left: 0,
    top: rect.top,
    width: Math.max(0, rect.left),
  });
  guides.dimRight.set({
    height: rect.height,
    left: rect.left + rect.width,
    top: rect.top,
    width: Math.max(0, canvasWidth - (rect.left + rect.width)),
  });
  guides.border.set({
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  });

  guides.dimTop.setCoords();
  guides.dimBottom.setCoords();
  guides.dimLeft.setCoords();
  guides.dimRight.setCoords();
  guides.border.setCoords();
}

/** Returns true when rect geometry has changed enough to require guide updates. */
function hasRectChanged(current: VideoWorkAreaRect, next: VideoWorkAreaRect) {
  const epsilon = 0.5;
  return (
    Math.abs(current.left - next.left) > epsilon ||
    Math.abs(current.top - next.top) > epsilon ||
    Math.abs(current.width - next.width) > epsilon ||
    Math.abs(current.height - next.height) > epsilon
  );
}

function bringGuidesToFront(canvas: Canvas, guides: VideoGuideSet) {
  const bringObjectToFront = (
    canvas as unknown as {
      bringObjectToFront?: (object: FabricObject) => void;
    }
  ).bringObjectToFront;

  if (typeof bringObjectToFront === 'function') {
    bringObjectToFront.call(canvas, guides.dimTop);
    bringObjectToFront.call(canvas, guides.dimBottom);
    bringObjectToFront.call(canvas, guides.dimLeft);
    bringObjectToFront.call(canvas, guides.dimRight);
    bringObjectToFront.call(canvas, guides.border);
    return;
  }

  // Fallback for older/variant Fabric APIs: re-add in desired stacking order.
  canvas.remove(
    guides.dimTop,
    guides.dimBottom,
    guides.dimLeft,
    guides.dimRight,
    guides.border,
  );
  canvas.add(
    guides.dimTop,
    guides.dimBottom,
    guides.dimLeft,
    guides.dimRight,
    guides.border,
  );
}

/** Overlay that marks the export-visible video area and aspect selector. */
export default function VideoWorkAreaOverlay({
  fabricCanvas,
  aspectRatio,
  aspectLabel,
  aspectOptions,
  onSelectAspectRatio,
}: VideoWorkAreaOverlayProps) {
  const guidesRef = useRef<VideoGuideSet | null>(null);
  const rectRef = useRef<VideoWorkAreaRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [isInfoHovered, setIsInfoHovered] = useState(false);
  const [labelPosition, setLabelPosition] = useState({ left: 0, top: -9999 });

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    if (!guidesRef.current) {
      const guides: VideoGuideSet = {
        border: createVideoGuideRect({
          fill: 'transparent',
          stroke: FIGMA_BLUE,
          strokeWidth: 2,
        }),
        dimTop: createVideoGuideRect({
          fill: 'rgba(0, 0, 0, 0.42)',
        }),
        dimBottom: createVideoGuideRect({
          fill: 'rgba(0, 0, 0, 0.42)',
        }),
        dimLeft: createVideoGuideRect({
          fill: 'rgba(0, 0, 0, 0.42)',
        }),
        dimRight: createVideoGuideRect({
          fill: 'rgba(0, 0, 0, 0.42)',
        }),
      };
      guidesRef.current = guides;
      canvas.add(
        guides.dimTop,
        guides.dimBottom,
        guides.dimLeft,
        guides.dimRight,
        guides.border,
      );
      bringGuidesToFront(canvas, guides);
    }

    const updateGuidesFromCanvas = () => {
      const activeGuides = guidesRef.current;
      if (!activeGuides) return;

      const rect = getVideoWorkAreaRect(
        canvas.getWidth(),
        canvas.getHeight(),
        aspectRatio,
      );
      rectRef.current = rect;

      updateGuideObjects(canvas, activeGuides, rect);
      setLabelPosition(computeVideoAreaLabelPosition(canvas, rect));
      bringGuidesToFront(canvas, activeGuides);
      canvas.requestRenderAll();
    };

    const onObjectAdded = (event: { target?: FabricObject }) => {
      if (isVideoGuideObject(event.target)) return;
      const activeGuides = guidesRef.current;
      if (!activeGuides) return;
      bringGuidesToFront(canvas, activeGuides);
    };

    const onAfterRender = () => {
      const activeGuides = guidesRef.current;
      if (!activeGuides) return;

      const nextRect = getVideoWorkAreaRect(
        canvas.getWidth(),
        canvas.getHeight(),
        aspectRatio,
      );
      if (hasRectChanged(rectRef.current, nextRect)) {
        rectRef.current = nextRect;
        updateGuideObjects(canvas, activeGuides, nextRect);
        bringGuidesToFront(canvas, activeGuides);
        canvas.requestRenderAll();
      }

      setLabelPosition(computeVideoAreaLabelPosition(canvas, rectRef.current));
    };

    updateGuidesFromCanvas();
    canvas.on('object:added', onObjectAdded);
    canvas.on('after:render', onAfterRender);
    window.addEventListener('resize', updateGuidesFromCanvas);

    return () => {
      canvas.off('object:added', onObjectAdded);
      canvas.off('after:render', onAfterRender);
      window.removeEventListener('resize', updateGuidesFromCanvas);
    };
  }, [aspectRatio, fabricCanvas]);

  useEffect(() => {
    return () => {
      const canvas = fabricCanvas.current;
      const guides = guidesRef.current;
      if (!canvas || !guides) return;
      canvas.remove(
        guides.dimTop,
        guides.dimBottom,
        guides.dimLeft,
        guides.dimRight,
        guides.border,
      );
      guidesRef.current = null;
      canvas.requestRenderAll();
    };
  }, [fabricCanvas]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="pointer-events-auto absolute flex items-center gap-1 transition-opacity"
        style={{
          left: labelPosition.left,
          opacity: isInfoHovered ? 1 : 0.45,
          top: labelPosition.top,
        }}
        onMouseEnter={() => {
          setIsInfoHovered(true);
        }}
        onMouseLeave={() => {
          setIsInfoHovered(false);
        }}
      >
        <div
          className={
            "rounded bg-[var(--wise-accent)]/95 px-2 py-0.5 text-[10px] " +
            "font-semibold uppercase tracking-wide text-white"
          }
        >
          Video Area
        </div>
        <select
          value={aspectLabel}
          onChange={(event) => {
            const selected = aspectOptions.find(
              (option) => option.label === event.target.value,
            );
            if (selected) {
              onSelectAspectRatio(selected.ratio);
            }
          }}
          className={
            "appearance-none rounded border border-[var(--wise-border)] " +
            "bg-[var(--wise-surface-raised)]/95 px-2 py-0.5 text-[10px] " +
            "font-semibold uppercase tracking-wide text-[#d4d4d4] outline-none " +
            "ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none " +
            "focus-visible:ring-0 hover:bg-[var(--wise-surface-muted)]"
          }
          style={{
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            backgroundImage: 'none',
          }}
          aria-label="Change video aspect ratio"
        >
          {aspectOptions.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
