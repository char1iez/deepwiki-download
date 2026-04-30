import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import {
  exportMergedMarkdownFromHtml,
  exportWikiFromHtml,
} from "../../src/core/exporter";
import type { DeepWikiProjectRef } from "../../src/shared/types";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/deepwiki-hermes-agent-self-evolution.html",
);
const htmlFixture = readFileSync(fixturePath, "utf8");

const project: DeepWikiProjectRef = {
  org: "NousResearch",
  repo: "hermes-agent-self-evolution",
  projectUrl: "https://deepwiki.com/NousResearch/hermes-agent-self-evolution",
};

describe("exportWikiFromHtml", () => {
  it("packages markdown pages, metadata, and asset warnings into a zip", async () => {
    const result = await exportWikiFromHtml({
      html: htmlFixture,
      project,
      fetchAsset: async (url) => {
        if (url.includes("missing")) {
          throw new Error("asset missing");
        }

        return {
          bytes: new TextEncoder().encode("asset-bytes"),
          contentType: "image/png",
        };
      },
    });

    const zip = await JSZip.loadAsync(result.zipBytes);
    const fileNames = Object.keys(zip.files).sort();
    const readme = await zip.file("README.md")?.async("string");
    const indexJson = await zip.file("index.json")?.async("string");
    const overviewPage = await zip.file("pages/1-overview.md")?.async("string");

    expect(fileNames).toContain("README.md");
    expect(fileNames).toContain("index.json");
    expect(fileNames).toContain("pages/1-overview.md");
    expect(readme).toContain("NousResearch/hermes-agent-self-evolution");
    expect(indexJson).toContain('"pageCount"');
    expect(overviewPage).toContain("# Overview");
    expect(overviewPage).toContain("## Relevant source files");
    expect(overviewPage).toContain(
      "- [PLAN.md](https://github.com/NousResearch/hermes-agent-self-evolution/blob/4693c8f0/PLAN.md)",
    );
    expect(result.pageCount).toBeGreaterThan(10);
  });
});

describe("exportMergedMarkdownFromHtml", () => {
  it("merges all pages into a single markdown document separated by page markers", async () => {
    const result = await exportMergedMarkdownFromHtml({
      html: htmlFixture,
      project,
    });

    expect(result.fileName).toBe("NousResearch-hermes-agent-self-evolution-deepwiki.md");
    expect(result.markdown).toContain("<!-- DeepWiki page: 1 Overview -->");
    expect(result.markdown).toContain("<!-- DeepWiki page: 1.1 Getting Started -->");
    expect(result.markdown).toContain("\n\n---\n\n<!-- DeepWiki page: 1.1 Getting Started -->");
    expect(result.markdown).toContain("# Overview");
    expect(result.markdown).toContain("# Getting Started");
    expect(result.markdown).not.toContain("# DeepWiki Export");
    expect(result.markdown).not.toContain("- Source: https://deepwiki.com/");
  });
});
