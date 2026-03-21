/** Editor Slice.Ts store state and reducers. */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { INITIAL_CANVAS_ZOOM } from "../../const";

export type EditorItemRecord = {
  childIds?: string[];
  isLocked?: boolean;
  name: string;
  keyframe: Array<{
    id: string;
    timestamp: number;
  }>;
};

export type EditorProjectInfo = {
  canvasWidth: number;
  canvasHeight: number;
  videoWidth: number;
  videoHeight: number;
  videoLeft: number;
  videoTop: number;
  videoRight: number;
  videoBottom: number;
  videoAspectRatio: number;
  videoAspectLabel: string;
  canvasZoom?: number;
};

export type SelectedTimelineKeyframe = {
  itemId: string;
  keyframeId: string;
  property: string;
  timestamp: number;
};

export type CanvasTool = "path" | "select";

export type EditorState = {
  playHeadTime: number;
  isPaused: boolean;
  canvasItemIds: string[];
  itemsRecord: Record<string, EditorItemRecord>;
  selectedId: string[];
  selectedKeyframe: SelectedTimelineKeyframe | null;
  selectedKeyframes: SelectedTimelineKeyframe[];
  activeCanvasTool: CanvasTool;
  projectInfo: EditorProjectInfo;
};

const initialState: EditorState = {
  playHeadTime: 0,
  isPaused: true,
  canvasItemIds: [],
  itemsRecord: {},
  selectedId: [],
  selectedKeyframe: null,
  selectedKeyframes: [],
  activeCanvasTool: "select",
  projectInfo: {
    canvasWidth: 0,
    canvasHeight: 0,
    videoWidth: 0,
    videoHeight: 0,
    videoLeft: 0,
    videoTop: 0,
    videoRight: 0,
    videoBottom: 0,
    videoAspectRatio: 16 / 9,
    videoAspectLabel: "16:9",
    canvasZoom: INITIAL_CANVAS_ZOOM,
  },
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setPlayheadTime(state, action: PayloadAction<number>) {
      state.playHeadTime = action.payload;
    },
    setIsPaused(state, action: PayloadAction<boolean>) {
      state.isPaused = action.payload;
    },
    setCanvasItemIds(state, action: PayloadAction<string[]>) {
      state.canvasItemIds = action.payload;
    },
    addCanvasItemId(state, action: PayloadAction<string>) {
      if (!state.canvasItemIds.includes(action.payload)) {
        state.canvasItemIds.unshift(action.payload);
      }
      state.itemsRecord[action.payload] ??= {
        isLocked: false,
        name: action.payload,
        keyframe: [],
      };
    },
    removeCanvasItemId(state, action: PayloadAction<string>) {
      state.canvasItemIds = state.canvasItemIds.filter((id) => id !== action.payload);
      delete state.itemsRecord[action.payload];
      if (state.selectedId.includes(action.payload)) {
        state.selectedId = state.selectedId.filter((id) => id !== action.payload);
      }
      if (state.selectedKeyframe?.itemId === action.payload) {
        state.selectedKeyframe = null;
      }
      state.selectedKeyframes = state.selectedKeyframes.filter(
        (keyframe) => keyframe.itemId !== action.payload,
      );
    },
    clearCanvasItemIds(state) {
      state.canvasItemIds = [];
      state.itemsRecord = {};
      state.selectedId = [];
      state.selectedKeyframe = null;
      state.selectedKeyframes = [];
      state.activeCanvasTool = "select";
    },
    setItemsRecord(state, action: PayloadAction<Record<string, EditorItemRecord>>) {
      state.itemsRecord = action.payload;
    },
    upsertItemRecord(state, action: PayloadAction<{ id: string; value: EditorItemRecord }>) {
      state.itemsRecord[action.payload.id] = {
        isLocked: false,
        ...action.payload.value,
      };
      if (!state.canvasItemIds.includes(action.payload.id)) {
        state.canvasItemIds.unshift(action.payload.id);
      }
    },
    toggleItemLocked(state, action: PayloadAction<{ id: string; isLocked: boolean }>) {
      const record = state.itemsRecord[action.payload.id];
      if (!record) return;

      record.isLocked = action.payload.isLocked;
      if (action.payload.isLocked && state.selectedId.includes(action.payload.id)) {
        state.selectedId = state.selectedId.filter((id) => id !== action.payload.id);
      }
      if (state.selectedKeyframe?.itemId === action.payload.id && action.payload.isLocked) {
        state.selectedKeyframe = null;
      }
      if (action.payload.isLocked) {
        state.selectedKeyframes = state.selectedKeyframes.filter(
          (keyframe) => keyframe.itemId !== action.payload.id,
        );
      }
    },
    updateItemName(state, action: PayloadAction<{ id: string; name: string }>) {
      const record = state.itemsRecord[action.payload.id];
      if (record) {
        record.name = action.payload.name;
      }
    },
    removeItemRecord(state, action: PayloadAction<string>) {
      delete state.itemsRecord[action.payload];
      state.canvasItemIds = state.canvasItemIds.filter((id) => id !== action.payload);
      if (state.selectedId.includes(action.payload)) {
        state.selectedId = state.selectedId.filter((id) => id !== action.payload);
      }
      if (state.selectedKeyframe?.itemId === action.payload) {
        state.selectedKeyframe = null;
      }
      state.selectedKeyframes = state.selectedKeyframes.filter(
        (keyframe) => keyframe.itemId !== action.payload,
      );
    },
    setSelectedId(state, action: PayloadAction<string[]>) {
      state.selectedId = action.payload;
      state.selectedKeyframes = state.selectedKeyframes.filter((keyframe) =>
        action.payload.includes(keyframe.itemId),
      );
      state.selectedKeyframe = state.selectedKeyframes[0] ?? null;
      if (state.selectedKeyframe && !action.payload.includes(state.selectedKeyframe.itemId)) {
        state.selectedKeyframe = null;
      }
    },
    setSelectedKeyframe(state, action: PayloadAction<SelectedTimelineKeyframe | null>) {
      state.selectedKeyframe = action.payload;
      state.selectedKeyframes = action.payload ? [action.payload] : [];
    },
    setSelectedKeyframes(state, action: PayloadAction<SelectedTimelineKeyframe[]>) {
      state.selectedKeyframes = action.payload;
      state.selectedKeyframe = action.payload[0] ?? null;
    },
    setActiveCanvasTool(state, action: PayloadAction<CanvasTool>) {
      state.activeCanvasTool = action.payload;
    },
    setProjectInfo(state, action: PayloadAction<Partial<EditorProjectInfo>>) {
      state.projectInfo = { ...state.projectInfo, ...action.payload };
    },
  },
});

export const {
  setPlayheadTime,
  setIsPaused,
  setCanvasItemIds,
  addCanvasItemId,
  removeCanvasItemId,
  clearCanvasItemIds,
  setItemsRecord,
  upsertItemRecord,
  removeItemRecord,
  setSelectedId,
  setSelectedKeyframe,
  setSelectedKeyframes,
  setActiveCanvasTool,
  setProjectInfo,
  toggleItemLocked,
  updateItemName,
} = editorSlice.actions;

export default editorSlice.reducer;
