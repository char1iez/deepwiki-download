import { collectAssetRefs } from "../core/assets";
import { requestOrigins, startBlobDownload } from "../core/chrome";
import {
  exportMergedMarkdownFromHtml,
  exportWikiFromHtml,
} from "../core/exporter";
import { parseEmbeddedWiki } from "../core/parser";
import {
  isGetExportStateMessage,
  isStartExportMessage,
} from "../shared/messages";
import type { ExportProgress } from "../shared/types";

let currentProgress: ExportProgress = {
  stage: "idle",
  message: "Idle",
};

function setProgress(progress: ExportProgress): void {
  currentProgress = progress;
}

async function requestExternalAssetOrigins(html: string): Promise<void> {
  const parsed = parseEmbeddedWiki(html);
  const origins = new Set<string>();

  for (const page of parsed.pages) {
    for (const asset of collectAssetRefs(page.content)) {
      try {
        const url = new URL(asset.originalUrl);
        if (url.origin !== "https://deepwiki.com") {
          origins.add(`${url.origin}/*`);
        }
      } catch {
        continue;
      }
    }
  }

  if (origins.size > 0) {
    await requestOrigins([...origins]);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isGetExportStateMessage(message)) {
    sendResponse({
      ok: true,
      data: currentProgress,
    });
    return false;
  }

  if (isStartExportMessage(message)) {
    void (async () => {
      try {
        setProgress({ stage: "fetching", message: "Fetching wiki" });
        const response = await fetch(message.payload.project.projectUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch project HTML: ${response.status}`);
        }

        const html = await response.text();

        setProgress({ stage: "parsing", message: "Parsing embedded data" });
        await requestExternalAssetOrigins(html);

        setProgress({ stage: "rewriting", message: "Rewriting links" });

        if (message.payload.mode === "merged-markdown") {
          const exported = await exportMergedMarkdownFromHtml({
            html,
            project: message.payload.project,
          });

          setProgress({ stage: "building-zip", message: "Building markdown" });
          await startBlobDownload(
            new TextEncoder().encode(exported.markdown),
            exported.fileName,
            "text/markdown;charset=utf-8",
          );

          setProgress({
            stage: "complete",
            message: `Downloaded ${exported.fileName}`,
          });

          sendResponse({
            ok: true,
            data: {
              fileName: exported.fileName,
              warningCount: exported.warningCount,
            },
          });
          return;
        }

        const exported = await exportWikiFromHtml({
          html,
          project: message.payload.project,
          fetchAsset: async (url) => {
            const assetResponse = await fetch(url);
            if (!assetResponse.ok) {
              throw new Error(`Failed asset fetch: ${assetResponse.status}`);
            }

            return {
              bytes: new Uint8Array(await assetResponse.arrayBuffer()),
              contentType: assetResponse.headers.get("content-type"),
            };
          },
        });

        setProgress({ stage: "building-zip", message: "Building zip" });
        const filename = `${message.payload.project.org}-${message.payload.project.repo}-deepwiki.zip`;
        await startBlobDownload(exported.zipBytes, filename);

        setProgress({
          stage: "complete",
          message: `Downloaded ${filename}`,
        });

        sendResponse({
          ok: true,
          data: {
            fileName: filename,
            warningCount: exported.warningCount,
          },
        });
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : "Unknown export error";
        setProgress({
          stage: "error",
          message: messageText,
        });
        sendResponse({
          ok: false,
          error: messageText,
        });
      }
    })();

    return true;
  }

  return false;
});
