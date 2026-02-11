import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.hot) {
  let wasDisconnected = false;

  import.meta.hot.on("vite:ws-disconnect", () => {
    wasDisconnected = true;
  });

  import.meta.hot.on("vite:ws-connect", () => {
    if (wasDisconnected) {
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
