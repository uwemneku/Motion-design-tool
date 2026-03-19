/** Canvas Zoom Control.Tsx module implementation. */
import { Search } from "lucide-react";
import { type ComponentProps } from "react";
import { getVideoWorkAreaRect } from "../export/video-work-area";
import { syncObjectControlBorderScale } from "./util/fabric-controls";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { useAppDispatch, useAppSelector } from "../../store";
import { setProjectInfo } from "../../store/editor-slice";
import { INITIAL_CANVAS_ZOOM, MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from "../../../const";

type CanvasZoomControlProps = Omit<ComponentProps<"button">, "type" | "onClick">;
const FIT_VIEW_PADDING_RATIO = 0.1;

/** Returns the overlap between two screen-space rectangles. */
function getOverlapSize(a: DOMRect, b: DOMRect) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return { height, width };
}

/** Picks the narrowest visible match for duplicated test-id wrappers. */
function getNarrowestVisibleElement(selector: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return elements.reduce<HTMLElement | null>((narrowest, element) => {
    const width = element.getBoundingClientRect().width;
    if (width <= 0) return narrowest;
    if (!narrowest) return element;
    return width < narrowest.getBoundingClientRect().width ? element : narrowest;
  }, null);
}

/** Renders the canvas zoom indicator and resets viewport zoom when clicked. */
export default function CanvasZoomControl({ ...buttonProps }: CanvasZoomControlProps) {
  const { fabricCanvasRef } = useCanvasAppContext();
  const canvasZoom = useAppSelector(
    (state) => state.editor.projectInfo.canvasZoom ?? INITIAL_CANVAS_ZOOM,
  );
  const videoAspectRatio = useAppSelector((state) => state.editor.projectInfo.videoAspectRatio);
  const dispatch = useAppDispatch();

  /** Fits the video area into the unobscured stage, accounting for panel and timeline overlap. */
  const fitVideoAreaToVisibleStage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const host = canvas.getElement().parentElement;
    if (!host) return;

    const hostRect = host.getBoundingClientRect();
    const sidePanel = document.querySelector<HTMLElement>("[data-testid='canvas-side-panel']");
    const floatingLayersPanel = getNarrowestVisibleElement(
      "[data-testid='floating-layers-panel']",
    );
    const timeline = document.querySelector<HTMLElement>("[data-testid='timeline']");
    const sidePanelRect = sidePanel?.getBoundingClientRect();
    const floatingLayersRect = floatingLayersPanel?.getBoundingClientRect();
    const timelineRect = timeline?.getBoundingClientRect();
    const sidePanelOverlap = sidePanelRect ? getOverlapSize(hostRect, sidePanelRect) : null;
    const floatingLayersOverlap = floatingLayersRect
      ? getOverlapSize(hostRect, floatingLayersRect)
      : null;
    const timelineOverlap = timelineRect ? getOverlapSize(hostRect, timelineRect) : null;

    let usableLeft = 0;
    const usableTop = 0;
    let usableRight = hostRect.width;
    let usableBottom = hostRect.height;

    if (floatingLayersRect && floatingLayersOverlap && floatingLayersOverlap.width > 0) {
      usableLeft = Math.max(usableLeft, floatingLayersRect.right - hostRect.left);
    }
    if (sidePanelRect && sidePanelOverlap && sidePanelOverlap.width > 0) {
      usableRight = Math.min(usableRight, sidePanelRect.left - hostRect.left);
    }
    if (timelineRect && timelineOverlap && timelineOverlap.height > 0) {
      usableBottom = Math.min(usableBottom, timelineRect.top - hostRect.top);
    }

    const unobscuredWidth = Math.max(1, usableRight - usableLeft);
    const unobscuredHeight = Math.max(1, usableBottom - usableTop);
    const availableWidth = unobscuredWidth * (1 - FIT_VIEW_PADDING_RATIO * 2);
    const availableHeight = unobscuredHeight * (1 - FIT_VIEW_PADDING_RATIO * 2);

    const safeViewportWidth = Math.max(1, availableWidth);
    const safeViewportHeight = Math.max(1, availableHeight);
    const videoRect = getVideoWorkAreaRect(
      canvas.getWidth(),
      canvas.getHeight(),
      videoAspectRatio,
    );
    const nextZoom = Math.min(
      MAX_CANVAS_ZOOM,
      Math.max(
        MIN_CANVAS_ZOOM,
        Math.min(
          safeViewportWidth / videoRect.width,
          safeViewportHeight / videoRect.height,
        ),
      ),
    );
    const leftInset = usableLeft + FIT_VIEW_PADDING_RATIO * unobscuredWidth;
    const topInset = usableTop + FIT_VIEW_PADDING_RATIO * unobscuredHeight;
    const visibleStageCenterX = leftInset + safeViewportWidth / 2;
    const visibleStageCenterY = topInset + safeViewportHeight / 2;
    const videoCenterX = videoRect.left + videoRect.width / 2;
    const videoCenterY = videoRect.top + videoRect.height / 2;
    const translateX = visibleStageCenterX - videoCenterX * nextZoom;
    const translateY = visibleStageCenterY - videoCenterY * nextZoom;

    canvas.setViewportTransform([nextZoom, 0, 0, nextZoom, translateX, translateY]);
    syncObjectControlBorderScale(canvas);
    canvas.requestRenderAll();
    dispatch(setProjectInfo({ canvasZoom: nextZoom }));
  };

  return (
    <button
      type="button"
      onClick={fitVideoAreaToVisibleStage}
      className="flex h-7 items-center conte gap-1.5 rounded-[5px] border border-[var(--wise-border)]  bg-[var(--wise-surface)] px-2.5 text-[11px] font-medium text-slate-200 "
      title="Fit video area to visible stage"
      aria-label="Fit video area to visible stage"
      {...buttonProps}
    >
      <Search className="size-3" strokeWidth={2} aria-hidden />
      <span className="h-3.5">{Math.round(canvasZoom * 100)}%</span>
    </button>
  );
}
