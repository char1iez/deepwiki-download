import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { extractFlightPushPayloads } from "../../src/core/flight";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/deepwiki-hermes-agent-self-evolution.html",
);
const htmlFixture = readFileSync(fixturePath, "utf8");

describe("extractFlightPushPayloads", () => {
  it("returns payload fragments from the real html fixture", () => {
    const payloads = extractFlightPushPayloads(htmlFixture);

    expect(payloads.length).toBeGreaterThan(0);
  });

  it("preserves payload ordering from the source html", () => {
    const payloads = extractFlightPushPayloads(htmlFixture);

    expect(payloads[0]).toContain('1:"$Sreact.fragment"');
  });

  it("extracts enough content to locate the embedded wiki payload", () => {
    const joined = extractFlightPushPayloads(htmlFixture).join("\n");

    expect(joined).toContain('"wiki":{"metadata"');
    expect(joined).toContain('"pages":[');
  });
});
