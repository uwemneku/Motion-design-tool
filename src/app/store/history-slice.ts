/** History Slice.Ts store state and reducers. */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type HistoryState = {
  canRedo: boolean;
  canUndo: boolean;
  redoRequestVersion: number;
  undoRequestVersion: number;
};

const initialState: HistoryState = {
  canUndo: false,
  canRedo: false,
  undoRequestVersion: 0,
  redoRequestVersion: 0,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    requestRedo(state) {
      state.redoRequestVersion += 1;
    },
    requestUndo(state) {
      state.undoRequestVersion += 1;
    },
    setHistoryAvailability(
      state,
      action: PayloadAction<{ canRedo: boolean; canUndo: boolean }>,
    ) {
      state.canUndo = action.payload.canUndo;
      state.canRedo = action.payload.canRedo;
    },
  },
});

export const { requestRedo, requestUndo, setHistoryAvailability } =
  historySlice.actions;

export default historySlice.reducer;
