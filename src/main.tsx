import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { CanvasAppProvider } from "./app/features/canvas/canvas-app-context";
import { store } from "./app/store";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <CanvasAppProvider>
        <App />
      </CanvasAppProvider>
    </Provider>
  </StrictMode>,
);
