import "./styles.css";
import { renderApp } from "./App";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Popup root element #app was not found");
}

void renderApp(root).catch((error: unknown) => {
  root.innerHTML = `
    <main class="popup-shell popup-shell--error">
      <section class="panel">
        <div class="panel__header">
          <div class="brand-mark brand-mark--mini" aria-hidden="true">
            <span class="brand-mark__sheet brand-mark__sheet--back"></span>
            <span class="brand-mark__sheet brand-mark__sheet--front"></span>
            <span class="brand-mark__badge">
              <span class="brand-mark__arrow"></span>
            </span>
          </div>
          <div>
            <p class="eyebrow">DeepWiki Downloader</p>
            <h1 class="title">Popup Error</h1>
          </div>
        </div>
        <p class="status status--error">${
        error instanceof Error ? error.message : "Failed to initialize popup"
      }</p>
      </section>
    </main>
  `;
});
