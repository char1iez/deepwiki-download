import { describe, expect, it } from "vitest";

import { pageFileName, sanitizeTitleForFilename } from "../../src/core/filenames";

describe("sanitizeTitleForFilename", () => {
  it("normalizes punctuation and whitespace for safe local filenames", () => {
    expect(sanitizeTitleForFilename("SkillModule: Wrapping Skills / for DSPy")).toBe(
      "skillmodule-wrapping-skills-for-dspy",
    );
  });

  it("removes filesystem-hostile characters", () => {
    expect(sanitizeTitleForFilename('A <bad> : "title" ? *')).toBe("a-bad-title");
  });
});

describe("pageFileName", () => {
  it("prefixes the sanitized title with the page id", () => {
    expect(pageFileName("3.1", "SkillModule: Wrapping Skills for DSPy")).toBe(
      "3.1-skillmodule-wrapping-skills-for-dspy.md",
    );
  });
});
