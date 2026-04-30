import { getActiveTabUrl, sendMessageToWorker } from "../core/chrome";
import { parseDeepWikiUrl } from "../core/url";

function renderLayout(
  projectLabel: string,
  status: string,
  buttonDisabled: boolean,
): string {
  return `
    <main class="popup-shell">
      <section class="panel">
        <div class="panel__header">
          <div class="brand-mark" aria-hidden="true">
            <span class="brand-mark__sheet brand-mark__sheet--back"></span>
            <span class="brand-mark__sheet brand-mark__sheet--front"></span>
            <span class="brand-mark__badge">
              <span class="brand-mark__arrow"></span>
            </span>
          </div>
          <div>
            <p class="eyebrow">Export Tool</p>
            <h1 class="title">DeepWiki</h1>
          </div>
        </div>

        <div class="project-pill">
          <span class="project-pill__label">Current Project</span>
          <span class="project-pill__value">${projectLabel}</span>
        </div>

        <div class="actions">
          <button id="download-button" class="action-card action-card--primary" type="button" ${buttonDisabled ? "disabled" : ""}>
            <span class="action-card__icon" aria-hidden="true">
              <span class="action-card__glyph action-card__glyph--stack"></span>
            </span>
            <span class="action-card__copy">
              <span class="action-card__title">Full Wiki</span>
              <span class="action-card__hint">ZIP with every page and assets</span>
            </span>
          </button>

          <button id="download-merged-button" class="action-card action-card--secondary" type="button" ${buttonDisabled ? "disabled" : ""}>
            <span class="action-card__icon" aria-hidden="true">
              <span class="action-card__glyph action-card__glyph--sheet"></span>
            </span>
            <span class="action-card__copy">
              <span class="action-card__title">One File</span>
              <span class="action-card__hint">Merged markdown for quick reading</span>
            </span>
          </button>
        </div>

        <p id="status" class="status">${status}</p>
      </section>
    </main>
  `;
}

export async function renderApp(root: HTMLDivElement): Promise<void> {
  const activeTabUrl = await getActiveTabUrl();
  const project = activeTabUrl ? parseDeepWikiUrl(activeTabUrl) : null;

  if (!project) {
    root.innerHTML = renderLayout(
      "No supported DeepWiki project detected.",
      "Open a DeepWiki project page first.",
      true,
    );
    return;
  }

  root.innerHTML = renderLayout(
    `${project.org}/${project.repo}`,
    "Ready to export.",
    false,
  );

  const button = root.querySelector<HTMLButtonElement>("#download-button");
  const mergedButton = root.querySelector<HTMLButtonElement>("#download-merged-button");
  const status = root.querySelector<HTMLParagraphElement>("#status");

  if (!button || !mergedButton || !status) {
    throw new Error("Popup controls did not render correctly");
  }

  const pollProgress = window.setInterval(async () => {
    const response = await sendMessageToWorker({ type: "GET_EXPORT_STATE" });
    if (response.ok && "message" in response.data) {
      status.textContent = response.data.message;
    }
  }, 750);

  window.addEventListener("unload", () => {
    window.clearInterval(pollProgress);
  });

  async function startExport(mode: "zip" | "merged-markdown"): Promise<void> {
    button.disabled = true;
    mergedButton.disabled = true;
    status.textContent = "Starting export...";

    const response = await sendMessageToWorker({
      type: "START_EXPORT",
      payload: { project, mode },
    });

    if (response.ok && "fileName" in response.data) {
      status.textContent = `Downloaded ${response.data.fileName}`;
      return;
    }

    button.disabled = false;
    mergedButton.disabled = false;
    status.textContent = response.ok ? response.data.message : response.error;
  }

  button.addEventListener("click", () => {
    void startExport("zip");
  });

  mergedButton.addEventListener("click", () => {
    void startExport("merged-markdown");
  });
}
