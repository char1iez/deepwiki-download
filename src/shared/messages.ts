import type { DeepWikiProjectRef, ExportFailure, ExportProgress, ExportSuccess } from "./types";

export interface StartExportMessage {
  type: "START_EXPORT";
  payload: {
    project: DeepWikiProjectRef;
    mode: "zip" | "merged-markdown";
  };
}

export interface GetExportStateMessage {
  type: "GET_EXPORT_STATE";
}

export type PopupToWorkerMessage = StartExportMessage | GetExportStateMessage;

export type WorkerToPopupResponse =
  | {
      ok: true;
      data: ExportSuccess | ExportProgress;
    }
  | {
      ok: false;
      error: ExportFailure["error"];
    };

export function isStartExportMessage(message: unknown): message is StartExportMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message as { type?: string }).type === "START_EXPORT"
  );
}

export function isGetExportStateMessage(message: unknown): message is GetExportStateMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message as { type?: string }).type === "GET_EXPORT_STATE"
  );
}
