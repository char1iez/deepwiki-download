import { describe, expect, it } from "vitest";

import { createZipDataUrl } from "../../src/core/chrome";

describe("createZipDataUrl", () => {
  it("encodes zip bytes into a data url without relying on object urls", () => {
    const bytes = new Uint8Array([80, 75, 3, 4]);

    expect(createZipDataUrl(bytes)).toBe("data:application/zip;base64,UEsDBA==");
  });

  it("encodes large byte arrays without overflowing the call stack", () => {
    const bytes = new Uint8Array(200_000).fill(65);

    const dataUrl = createZipDataUrl(bytes);

    expect(dataUrl.startsWith("data:application/zip;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(200_000);
  });

  it("encodes large byte arrays in browser fallback mode without spreading the full array", () => {
    const previousBuffer = globalThis.Buffer;
    const bytes = new Uint8Array(200_000).fill(65);

    // Simulate the extension runtime path where Buffer is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Buffer = undefined;

    try {
      const dataUrl = createZipDataUrl(bytes);
      expect(dataUrl.startsWith("data:application/zip;base64,")).toBe(true);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Buffer = previousBuffer;
    }
  });
});
