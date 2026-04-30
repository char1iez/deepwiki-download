import { describe, expect, it } from "vitest";

import { isSupportedDeepWikiUrl, parseDeepWikiUrl } from "../../src/core/url";

describe("parseDeepWikiUrl", () => {
  it("normalizes a DeepWiki root project url", () => {
    expect(parseDeepWikiUrl("https://deepwiki.com/NousResearch/hermes-agent-self-evolution")).toEqual({
      org: "NousResearch",
      repo: "hermes-agent-self-evolution",
      projectUrl: "https://deepwiki.com/NousResearch/hermes-agent-self-evolution",
    });
  });

  it("normalizes a DeepWiki subpage to the project root", () => {
    expect(
      parseDeepWikiUrl(
        "https://deepwiki.com/NousResearch/hermes-agent-self-evolution/1.1-getting-started",
      ),
    ).toEqual({
      org: "NousResearch",
      repo: "hermes-agent-self-evolution",
      projectUrl: "https://deepwiki.com/NousResearch/hermes-agent-self-evolution",
    });
  });

  it("returns null for non-DeepWiki URLs", () => {
    expect(parseDeepWikiUrl("https://example.com/NousResearch/hermes-agent-self-evolution")).toBeNull();
  });

  it("returns null for incomplete DeepWiki paths", () => {
    expect(parseDeepWikiUrl("https://deepwiki.com/NousResearch")).toBeNull();
  });
});

describe("isSupportedDeepWikiUrl", () => {
  it("returns true for supported project pages", () => {
    expect(isSupportedDeepWikiUrl("https://deepwiki.com/NousResearch/hermes-agent-self-evolution")).toBe(
      true,
    );
  });

  it("returns false for unsupported pages", () => {
    expect(isSupportedDeepWikiUrl("https://deepwiki.com/NousResearch")).toBe(false);
  });
});
