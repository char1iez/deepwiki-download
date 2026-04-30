import { describe, expect, it } from "vitest";

import {
  buildPagePathMap,
  enrichSourceLinks,
  rewriteMarkdownLinks,
  transformRelevantSourceFilesBlock,
} from "../../src/core/links";
import type { WikiMetadata, WikiPage } from "../../src/shared/types";

const pages: WikiPage[] = [
  {
    id: "1",
    title: "Overview",
    sourcePath: "1-overview",
    content: "# Overview",
  },
  {
    id: "1.1",
    title: "Getting Started",
    sourcePath: "1.1-getting-started",
    content: "# Getting Started",
  },
];

const metadata: WikiMetadata = {
  repoName: "NousResearch/hermes-agent-self-evolution",
  commitHash: "4693c8f0",
  generatedAt: "2026-03-30T11:12:31.042963",
};

describe("buildPagePathMap", () => {
  it("builds a lookup from page ids and deepwiki urls to local markdown paths", () => {
    const pagePathMap = buildPagePathMap(pages, {
      org: "NousResearch",
      repo: "hermes-agent-self-evolution",
      projectUrl: "https://deepwiki.com/NousResearch/hermes-agent-self-evolution",
    });

    expect(pagePathMap.get("1.1")).toBe("./1.1-getting-started.md");
    expect(pagePathMap.get("https://deepwiki.com/NousResearch/hermes-agent-self-evolution/1.1-getting-started")).toBe(
      "./1.1-getting-started.md",
    );
  });
});

describe("rewriteMarkdownLinks", () => {
  const pagePathMap = buildPagePathMap(pages, {
    org: "NousResearch",
    repo: "hermes-agent-self-evolution",
    projectUrl: "https://deepwiki.com/NousResearch/hermes-agent-self-evolution",
  });

  it("rewrites absolute DeepWiki links to local relative markdown paths", () => {
    const result = rewriteMarkdownLinks(
      "[Read more](https://deepwiki.com/NousResearch/hermes-agent-self-evolution/1.1-getting-started)",
      { pagePathMap },
    );

    expect(result.markdown).toBe("[Read more](./1.1-getting-started.md)");
    expect(result.warnings).toHaveLength(0);
  });

  it("rewrites root-relative DeepWiki links and preserves anchors", () => {
    const result = rewriteMarkdownLinks(
      "[Read more](/NousResearch/hermes-agent-self-evolution/1.1-getting-started#prerequisites)",
      { pagePathMap },
    );

    expect(result.markdown).toBe("[Read more](./1.1-getting-started.md#prerequisites)");
  });

  it("preserves same-page anchors and external links", () => {
    const result = rewriteMarkdownLinks(
      "[Jump](#overview) [External](https://example.com/docs)",
      { pagePathMap },
    );

    expect(result.markdown).toBe("[Jump](#overview) [External](https://example.com/docs)");
  });

  it("rewrites page id anchor references into cross-page links", () => {
    const result = rewriteMarkdownLinks("1. [Getting Started](#1.1)", { pagePathMap });

    expect(result.markdown).toBe("1. [Getting Started](./1.1-getting-started.md)");
  });
});

describe("enrichSourceLinks", () => {
  it("converts empty source links into GitHub blob links", () => {
    const result = enrichSourceLinks("Sources: [README.md:1-7]()", metadata);

    expect(result.markdown).toBe(
      "Sources: [README.md:1-7](https://github.com/NousResearch/hermes-agent-self-evolution/blob/4693c8f0/README.md?plain=1#L1-L7)",
    );
  });
});

describe("transformRelevantSourceFilesBlock", () => {
  it("converts the leading relevant source files details block into a markdown section with clickable links", () => {
    const markdown = `<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [PLAN.md](PLAN.md)
- [README.md](README.md)

</details>

# Overview`;

    const result = transformRelevantSourceFilesBlock(markdown, metadata);

    expect(result.markdown).toContain("## Relevant source files");
    expect(result.markdown).toContain(
      "- [PLAN.md](https://github.com/NousResearch/hermes-agent-self-evolution/blob/4693c8f0/PLAN.md)",
    );
    expect(result.markdown).toContain(
      "- [README.md](https://github.com/NousResearch/hermes-agent-self-evolution/blob/4693c8f0/README.md)",
    );
    expect(result.markdown).not.toContain("<details>");
  });
});
