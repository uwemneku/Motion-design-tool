import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type EditorItemRecord = {
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
};

export type EditorState = {
  playheadTime: number;
  isPaused: boolean;
  canvasItemIds: string[];
  itemsRecord: Record<string, EditorItemRecord>;
  selectedId: string | null;
  projectInfo: EditorProjectInfo;
};

const initialState: EditorState = {
  playheadTime: 0,
  isPaused: true,
  canvasItemIds: [],
  itemsRecord: {},
  selectedId: null,
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
  },
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setPlayheadTime(state, action: PayloadAction<number>) {
      state.playheadTime = action.payload;
    },
    setIsPaused(state, action: PayloadAction<boolean>) {
      state.isPaused = action.payload;
    },
    setCanvasItemIds(state, action: PayloadAction<string[]>) {
      state.canvasItemIds = action.payload;
    },
    addCanvasItemId(state, action: PayloadAction<string>) {
      if (!state.canvasItemIds.includes(action.payload)) {
        state.canvasItemIds.push(action.payload);
      }
      state.itemsRecord[action.payload] ??= {
        name: action.payload,
        keyframe: [],
      };
    },
    removeCanvasItemId(state, action: PayloadAction<string>) {
      state.canvasItemIds = state.canvasItemIds.filter((id) => id !== action.payload);
      delete state.itemsRecord[action.payload];
      if (state.selectedId === action.payload) {
        state.selectedId = null;
      }
    },
    clearCanvasItemIds(state) {
      state.canvasItemIds = [];
      state.itemsRecord = {};
      state.selectedId = null;
    },
    setItemsRecord(
      state,
      action: PayloadAction<Record<string, EditorItemRecord>>,
    ) {
      state.itemsRecord = action.payload;
    },
    upsertItemRecord(
      state,
      action: PayloadAction<{ id: string; value: EditorItemRecord }>,
    ) {
      state.itemsRecord[action.payload.id] = action.payload.value;
      if (!state.canvasItemIds.includes(action.payload.id)) {
        state.canvasItemIds.push(action.payload.id);
      }
    },
    removeItemRecord(state, action: PayloadAction<string>) {
      delete state.itemsRecord[action.payload];
      state.canvasItemIds = state.canvasItemIds.filter((id) => id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = null;
      }
    },
    setSelectedId(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    setProjectInfo(state, action: PayloadAction<EditorProjectInfo>) {
      state.projectInfo = action.payload;
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
  setProjectInfo,
} = editorSlice.actions;

export default editorSlice.reducer;
