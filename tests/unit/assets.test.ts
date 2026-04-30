import { describe, expect, it } from "vitest";

import { collectAssetRefs, rewriteAssetRefs } from "../../src/core/assets";

describe("collectAssetRefs", () => {
  it("collects markdown image references", () => {
    const refs = collectAssetRefs("![Diagram](https://example.com/image.png)");

    expect(refs).toEqual([
      {
        originalUrl: "https://example.com/image.png",
      },
    ]);
  });

  it("collects simple html image references and deduplicates urls", () => {
    const refs = collectAssetRefs(`
      ![Diagram](https://example.com/image.png)
      <img src="https://example.com/image.png" />
      <img src="https://example.com/other.webp" />
    `);

    expect(refs).toEqual([
      { originalUrl: "https://example.com/image.png" },
      { originalUrl: "https://example.com/other.webp" },
    ]);
  });
});

describe("rewriteAssetRefs", () => {
  it("rewrites markdown and html image references to local asset paths", () => {
    const markdown = `
![Diagram](https://example.com/image.png)
<img src="https://example.com/other.webp" />
`;

    const rewritten = rewriteAssetRefs(markdown, new Map([
      ["https://example.com/image.png", "../assets/image.png"],
      ["https://example.com/other.webp", "../assets/other.webp"],
    ]));

    expect(rewritten).toContain("![Diagram](../assets/image.png)");
    expect(rewritten).toContain('<img src="../assets/other.webp" />');
  });
});
