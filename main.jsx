import "./storage.js"; // doit être importé avant App pour que window.storage existe
import React from "react";
import ReactDOM from "react-dom/client";

function showError(title, detail) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<div style="padding:20px;font-family:monospace;color:#a33;white-space:pre-wrap;line-height:1.5;">' +
      "<strong>" + title + "</strong>\n\n" + detail +
      "</div>";
  }
}

window.onerror = function (message, source, lineno, colno, error) {
  showError("Erreur JavaScript :", message + "\n" + source + ":" + lineno + ":" + colno + "\n" + (error && error.stack ? error.stack : ""));
};
window.addEventListener("unhandledrejection", function (event) {
  showError("Erreur (promise) :", String(event.reason));
});

(async () => {
  try {
    const mod = await import("./App.jsx");
    const App = mod.default;
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    showError("Erreur au chargement de l'application :", (e && e.message ? e.message : String(e)) + "\n\n" + (e && e.stack ? e.stack : ""));
  }
})();
