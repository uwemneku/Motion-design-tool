/** Index.Ts store state and reducers. */
import { configureStore } from "@reduxjs/toolkit";
import editorReducer from "./editor-slice";
import historyReducer from "./history-slice";
import { useDispatch, useSelector } from "react-redux";

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    history: historyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export function dispatchableSelector<T>(selector: (state: RootState) => T) {
  return (_: unknown, getState: () => RootState) => selector(getState());
}

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
