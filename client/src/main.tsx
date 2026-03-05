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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage('skipWaiting');
              }
            });
          }
        });
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
