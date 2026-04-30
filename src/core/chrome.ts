import type { PopupToWorkerMessage, WorkerToPopupResponse } from "../shared/messages";

const BINARY_CHUNK_SIZE = 0x8000;

export async function getActiveTabUrl(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? null;
}

export async function sendMessageToWorker(
  message: PopupToWorkerMessage,
): Promise<WorkerToPopupResponse> {
  return chrome.runtime.sendMessage(message) as Promise<WorkerToPopupResponse>;
}

export function createZipDataUrl(bytes: Uint8Array): string {
  return createDataUrl(bytes, "application/zip");
}

export function createDataUrl(bytes: Uint8Array, mimeType: string): string {
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(bytes).toString("base64")
    : btoa(uint8ArrayToBinaryString(bytes));

  return `data:${mimeType};base64,${base64}`;
}

function uint8ArrayToBinaryString(bytes: Uint8Array): string {
  let binary = "";

  for (let index = 0; index < bytes.length; index += BINARY_CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + BINARY_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return binary;
}

export async function startBlobDownload(
  bytes: Uint8Array,
  filename: string,
  mimeType = "application/zip",
): Promise<void> {
  const url = createDataUrl(bytes, mimeType);

  await chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });
}

export async function requestOrigins(origins: string[]): Promise<boolean> {
  if (origins.length === 0) return true;

  return chrome.permissions.request({
    origins,
  });
}
