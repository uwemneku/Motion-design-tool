/** Index.Ts store state and reducers. */
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './editor-slice';
import historyReducer from './history-slice';

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
