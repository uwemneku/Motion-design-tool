import { Canvas } from "fabric";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState } from "../../store";
import type { AppDispatch } from "../../store";
import { setSelectedId, upsertItemRecord } from "../../store/editor-slice";
import { applyFigmaLikeControls } from "./fabric-controls";
import { initAligningGuidelines } from "fabric/extensions";
import { useCanvasAppContext } from "./use-canvas-app-context";

const KEYFRAME_EPSILON = 0.001;

function createKeyframeMarkerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
}

function useFabricEditor() {
  const fabricRef = useRef<Canvas | null>(null);
  const playheadRef = useRef(0);
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { instancesRef, getInstanceById } = useCanvasAppContext();
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const playheadTime = useSelector((state: RootState) => state.editor.playheadTime);

  useEffect(() => {
    playheadRef.current = playheadTime;
  }, [playheadTime]);

  const bindHost = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (!node || fabricRef.current) return;

      fabricRef.current = new Canvas(node, {
        width: node.clientWidth || 1280,
        height: node.clientHeight || 720,
        backgroundColor: "#f6f7fb",
        preserveObjectStacking: true,
        selection: true,
      });
      initAligningGuidelines(fabricRef.current, { color: "rgb(81 162 255)" });

      applyFigmaLikeControls(fabricRef.current);

      fabricRef.current.on("selection:created", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
        dispatch(setSelectedId(customId));
      });

      fabricRef.current.on("selection:updated", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
        dispatch(setSelectedId(customId));
      });

      fabricRef.current.on("selection:cleared", () => {
        dispatch(setSelectedId(null));
      });

      fabricRef.current.on("object:modified", ({ target }) => {
        const customId = target?.customId;
        if (!customId) return;

        const instance = getInstanceById(customId);
        if (!instance) return;

        const timestamp = playheadRef.current;
        instance.addSnapshotKeyframe(timestamp, instance.getSnapshot());

        const state = store.getState().editor;
        const existing = state.itemsRecord[customId];
        if (!existing) return;

        const hasAtTimestamp = existing.keyframe.some(
          (keyframe) => Math.abs(keyframe.timestamp - timestamp) <= KEYFRAME_EPSILON,
        );
        const nextKeyframes = hasAtTimestamp
          ? existing.keyframe
          : [...existing.keyframe, { id: createKeyframeMarkerId(), timestamp }].sort(
              (a, b) => a.timestamp - b.timestamp,
            );

        dispatch(
          upsertItemRecord({
            id: customId,
            value: {
              ...existing,
              keyframe: nextKeyframes,
            },
          }),
        );
      });
    },
    [dispatch, getInstanceById, store],
  );

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (!selectedId) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }

    const selectedObject = canvas
      .getObjects()
      .find((object) => object.customId === selectedId);

    if (!selectedObject) return;
    canvas.setActiveObject(selectedObject);
    canvas.requestRenderAll();
  }, [selectedId]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    instancesRef.current.forEach((instance) => {
      instance.seek(playheadTime);
    });
    canvas.requestRenderAll();
  }, [instancesRef, playheadTime]);

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, []);

  return { bindHost, fabricCanvas: fabricRef };
}

export default useFabricEditor;
