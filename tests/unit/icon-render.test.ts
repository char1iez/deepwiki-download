import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { renderIcons } from "../../scripts/render-icons.mjs";

function findNonBackgroundBounds(png: PNG, backgroundRgb: [number, number, number]) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];

      if (
        a > 0 &&
        (r !== backgroundRgb[0] || g !== backgroundRgb[1] || b !== backgroundRgb[2])
      ) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

describe("renderIcons", () => {
  it("renders the SVG to fill the PNG canvas instead of shrinking into a thumbnail corner", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "deepwiki-icon-render-"));

    try {
      await renderIcons({
        inputPath: join(process.cwd(), "public/icon.svg"),
        outputDir: tempDir,
      });

      const png = PNG.sync.read(readFileSync(join(tempDir, "icon-128.png")));
      const bounds = findNonBackgroundBounds(png, [0xf2, 0xf7, 0xf2]);

      expect(png.width).toBe(128);
      expect(png.height).toBe(128);
      expect(bounds.minX).toBeLessThan(12);
      expect(bounds.minY).toBeLessThan(12);
      expect(bounds.maxX).toBeGreaterThan(116);
      expect(bounds.maxY).toBeGreaterThan(116);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
