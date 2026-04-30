import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseEmbeddedWiki } from "../../src/core/parser";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/deepwiki-hermes-agent-self-evolution.html",
);
const htmlFixture = readFileSync(fixturePath, "utf8");

describe("parseEmbeddedWiki", () => {
  it("parses metadata and pages from a real fixture", () => {
    const wiki = parseEmbeddedWiki(htmlFixture);

    expect(wiki.metadata.repoName).toBe("NousResearch/hermes-agent-self-evolution");
    expect(wiki.metadata.commitHash).toBe("4693c8f0");
    expect(wiki.pages.length).toBeGreaterThan(10);
  });

  it("resolves content references into markdown strings", () => {
    const wiki = parseEmbeddedWiki(htmlFixture);

    expect(wiki.pages[0]).toMatchObject({
      id: "1",
      title: "Overview",
    });
    expect(wiki.pages[0].content).toContain("# Overview");
    expect(wiki.pages[1].content).toContain("# Getting Started");
  });

  it("throws when a page content reference cannot be resolved", () => {
    const brokenHtml = htmlFixture.replace('17:T1813,', 'zz:T1813,');

    expect(() => parseEmbeddedWiki(brokenHtml)).toThrow(/content reference/i);
  });
});
