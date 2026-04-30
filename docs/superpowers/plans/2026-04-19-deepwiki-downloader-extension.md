# DeepWiki Downloader Extension Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension that exports the full embedded DeepWiki wiki for the current project page into a ZIP containing Markdown pages, rewritten local links, downloaded assets, and export metadata.

**Architecture:** The extension uses a popup UI plus a background service worker. The worker fetches the DeepWiki root HTML, resolves the embedded Next.js Flight wiki payload into structured page data, rewrites links and image references into local paths, downloads assets, assembles a ZIP with JSZip, and triggers the browser download. Core parsing and export logic lives in pure TypeScript modules with fixture-driven tests.

**Tech Stack:** TypeScript, Vite, Chrome Extension Manifest V3, JSZip, Vitest

---

## File Structure

### Planned files and responsibilities

- Create: `package.json` — npm scripts and dependencies
- Create: `tsconfig.json` — TypeScript config for source and tests
- Create: `vite.config.ts` — Vite build config for MV3 extension
- Create: `vitest.config.ts` — Vitest config for unit and integration tests
- Create: `.gitignore` — ignore build output, dependencies, temp files
- Create: `public/manifest.json` — MV3 manifest with popup, worker, permissions
- Create: `public/icons/` assets or placeholders — extension icons
- Create: `src/popup/index.html` — popup HTML entry
- Create: `src/popup/main.ts` — popup bootstrap
- Create: `src/popup/App.ts` — popup state and actions
- Create: `src/background/index.ts` — service worker message handling and workflow orchestration
- Create: `src/shared/types.ts` — shared domain types for pages, assets, progress, results
- Create: `src/shared/messages.ts` — message contracts between popup and worker
- Create: `src/core/url.ts` — DeepWiki URL detection and root URL normalization
- Create: `src/core/flight.ts` — extraction of `self.__next_f.push(...)` fragments
- Create: `src/core/parser.ts` — resolve embedded wiki metadata, pages, and content strings
- Create: `src/core/filenames.ts` — safe filename/path generation
- Create: `src/core/links.ts` — internal link rewriting and source-link enrichment
- Create: `src/core/assets.ts` — image discovery, dedupe, download, and local asset mapping
- Create: `src/core/archive.ts` — JSZip assembly and blob generation
- Create: `src/core/exporter.ts` — end-to-end export pipeline
- Create: `src/core/chrome.ts` — small wrappers around Chrome APIs for worker/popup use
- Create: `tests/fixtures/deepwiki-hermes-agent-self-evolution.html` — real captured DeepWiki HTML fixture
- Create: `tests/unit/url.test.ts` — URL parsing tests
- Create: `tests/unit/flight.test.ts` — Flight extraction tests
- Create: `tests/unit/parser.test.ts` — embedded wiki parsing tests
- Create: `tests/unit/filenames.test.ts` — filename sanitization tests
- Create: `tests/unit/links.test.ts` — link rewrite and source enrichment tests
- Create: `tests/unit/assets.test.ts` — asset extraction and rewrite tests
- Create: `tests/integration/exporter.test.ts` — export pipeline integration test
- Modify: `docs/superpowers/specs/2026-04-19-deepwiki-downloader-design.md` only if implementation reveals a spec mismatch that must be documented

## Chunk 1: Project Scaffold and Extension Shell

### Task 1: Initialize project metadata and toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing scaffold verification expectation**

Document the first expected checks in the plan:

```text
npm run build
npm run test
```

Expected initially: commands fail because project files do not exist yet.

- [ ] **Step 2: Create `package.json` with minimal extension scripts**

Include exact scripts:

```json
{
  "name": "deepwiki-downloader-extension",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest run"
  }
}
```

Add dependencies:

- `jszip`

Add dev dependencies:

- `typescript`
- `vite`
- `vitest`
- `@types/chrome`
- optional lightweight Vite static copy plugin only if needed for manifest/icon copying

- [ ] **Step 3: Add TypeScript and Vite configuration**

Create configs that:

- compile from `src/`
- allow DOM and WebWorker types
- include `chrome` types
- output extension assets into `dist/`

Minimal `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "WebWorker"],
    "strict": true,
    "types": ["chrome", "vitest/globals"]
  }
}
```

- [ ] **Step 4: Add `.gitignore`**

Ignore:

```gitignore
node_modules
dist
.DS_Store
coverage
```

- [ ] **Step 5: Run build to verify current failure mode**

Run:

```bash
npm run build
```

Expected: FAIL because manifest and source entry points do not exist yet.

- [ ] **Step 6: Commit scaffold files**

Run:

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts .gitignore
git commit -m "chore: scaffold extension toolchain"
```

### Task 2: Create the manifest and popup/worker shell

**Files:**
- Create: `public/manifest.json`
- Create: `src/popup/index.html`
- Create: `src/popup/main.ts`
- Create: `src/popup/App.ts`
- Create: `src/background/index.ts`
- Create: `src/shared/types.ts`
- Create: `src/shared/messages.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing shell build expectation**

Expected failure target:

```text
build should fail until popup and background entries are created and referenced correctly
```

- [ ] **Step 2: Add MV3 manifest**

Manifest must include:

- `manifest_version: 3`
- action popup entry
- background service worker entry
- `permissions`: `activeTab`, `downloads`, `storage`
- `host_permissions`: `https://deepwiki.com/*`
- `optional_host_permissions`: `https://*/*`

Do not add `scripting` unless implementation proves it is required.

- [ ] **Step 3: Add popup shell**

Create a minimal popup UI that renders one root element and text placeholders for:

- unsupported tab state
- detected project state
- progress state
- success/error state

- [ ] **Step 4: Add background shell**

Create a minimal service worker that accepts a `START_EXPORT` message and responds with a `not implemented` error for now.

- [ ] **Step 5: Define shared message and state types**

Add exact domain types for:

- `DeepWikiProjectRef`
- `WikiMetadata`
- `WikiPage`
- `ExportWarning`
- `ExportProgress`
- `ExportSuccess`
- `ExportFailure`
- popup-to-worker messages
- worker-to-popup state

- [ ] **Step 6: Run build to verify shell compiles**

Run:

```bash
npm run build
```

Expected: PASS with a generated `dist/` extension bundle.

- [ ] **Step 7: Commit extension shell**

Run:

```bash
git add public/manifest.json src/popup src/background src/shared
git commit -m "feat: add extension popup and worker shell"
```

## Chunk 2: Core Parsing and Rewrite Modules

### Task 3: Implement and test DeepWiki URL normalization

**Files:**
- Create: `src/core/url.ts`
- Test: `tests/unit/url.test.ts`

- [ ] **Step 1: Write the failing tests for supported URLs**

Cover cases:

- project root URL
- project subpage URL
- invalid non-DeepWiki URL
- malformed DeepWiki path

Example:

```ts
it("normalizes a DeepWiki subpage to the project root", () => {
  expect(normalizeProjectUrl("https://deepwiki.com/NousResearch/hermes-agent-self-evolution/1.1-getting-started"))
    .toEqual({
      org: "NousResearch",
      repo: "hermes-agent-self-evolution",
      projectUrl: "https://deepwiki.com/NousResearch/hermes-agent-self-evolution"
    });
});
```

- [ ] **Step 2: Run the URL tests to verify they fail**

Run:

```bash
npm run test -- tests/unit/url.test.ts
```

Expected: FAIL because `src/core/url.ts` does not exist yet.

- [ ] **Step 3: Write minimal URL normalization implementation**

Implement functions:

- `parseDeepWikiUrl(url: string): DeepWikiProjectRef | null`
- `isSupportedDeepWikiUrl(url: string): boolean`

Rules:

- accept only `https://deepwiki.com`
- require at least `<org>/<repo>`
- ignore trailing wiki route segments when computing `projectUrl`

- [ ] **Step 4: Run the URL tests to verify they pass**

Run:

```bash
npm run test -- tests/unit/url.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the URL module**

Run:

```bash
git add src/core/url.ts tests/unit/url.test.ts
git commit -m "feat: add deepwiki url normalization"
```

### Task 4: Implement Flight fragment extraction

**Files:**
- Create: `src/core/flight.ts`
- Create: `tests/fixtures/deepwiki-hermes-agent-self-evolution.html`
- Test: `tests/unit/flight.test.ts`

- [ ] **Step 1: Capture and save a real HTML fixture**

Save a real DeepWiki root HTML response from:

```text
https://deepwiki.com/NousResearch/hermes-agent-self-evolution
```

to:

```text
tests/fixtures/deepwiki-hermes-agent-self-evolution.html
```

- [ ] **Step 2: Write the failing tests for fragment extraction**

Test that `extractFlightPushPayloads(html)`:

- returns payload fragments in source order
- returns a non-empty array for the real fixture
- exposes enough text to locate the `wiki` payload

- [ ] **Step 3: Run the Flight tests to verify they fail**

Run:

```bash
npm run test -- tests/unit/flight.test.ts
```

Expected: FAIL because extractor implementation does not exist yet.

- [ ] **Step 4: Write minimal Flight extraction implementation**

Implement regex/string scanning that extracts script payloads from:

```ts
self.__next_f.push([1,"..."])
```

The implementation should:

- preserve ordering
- decode escaped newline markers enough for downstream parsing
- avoid over-parsing unrelated script tags

- [ ] **Step 5: Run the Flight tests to verify they pass**

Run:

```bash
npm run test -- tests/unit/flight.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the Flight extractor and fixture**

Run:

```bash
git add src/core/flight.ts tests/fixtures/deepwiki-hermes-agent-self-evolution.html tests/unit/flight.test.ts
git commit -m "feat: extract next flight payloads from deepwiki html"
```

### Task 5: Implement embedded wiki parser

**Files:**
- Create: `src/core/parser.ts`
- Test: `tests/unit/parser.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Cover:

- metadata extraction
- page list extraction
- content reference resolution
- missing content reference failure

Example:

```ts
it("parses embedded wiki pages from a real fixture", () => {
  const wiki = parseEmbeddedWiki(htmlFixture);
  expect(wiki.metadata.repoName).toBe("NousResearch/hermes-agent-self-evolution");
  expect(wiki.pages.length).toBeGreaterThan(5);
  expect(wiki.pages[0].content).toContain("#");
});
```

- [ ] **Step 2: Run the parser tests to verify they fail**

Run:

```bash
npm run test -- tests/unit/parser.test.ts
```

Expected: FAIL because parser implementation does not exist yet.

- [ ] **Step 3: Write minimal parser implementation**

Implement:

- `parseEmbeddedWiki(html: string): ParsedWiki`

Implementation responsibilities:

- use `extractFlightPushPayloads`
- locate the serialized `wiki` object
- resolve `content: "$id"` indirections into actual string bodies from the same payload stream
- map source metadata into stable internal types
- throw clear typed errors when required nodes are missing

- [ ] **Step 4: Run the parser tests to verify they pass**

Run:

```bash
npm run test -- tests/unit/parser.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the parser**

Run:

```bash
git add src/core/parser.ts tests/unit/parser.test.ts
git commit -m "feat: parse embedded deepwiki wiki payloads"
```

### Task 6: Implement filename, link, and source-enrichment logic

**Files:**
- Create: `src/core/filenames.ts`
- Create: `src/core/links.ts`
- Test: `tests/unit/filenames.test.ts`
- Test: `tests/unit/links.test.ts`

- [ ] **Step 1: Write the failing filename tests**

Cover:

- normal title sanitization
- colon and slash removal
- whitespace normalization
- stable page-id-prefixed path generation

- [ ] **Step 2: Write the failing link rewrite tests**

Cover:

- DeepWiki absolute page links
- DeepWiki root-relative page links
- cross-page anchor links
- same-page anchor preservation
- external link preservation
- `(#1.1)` page-id reference rewrite
- `Sources: [file.py:20-27]()` enrichment using repo name and commit hash

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
npm run test -- tests/unit/filenames.test.ts tests/unit/links.test.ts
```

Expected: FAIL because implementation does not exist yet.

- [ ] **Step 4: Write minimal filename implementation**

Implement functions:

- `sanitizeTitleForFilename(title: string): string`
- `pageFileName(pageId: string, title: string): string`

- [ ] **Step 5: Write minimal link/source rewrite implementation**

Implement functions:

- `buildPagePathMap(pages: WikiPage[]): Map<string, string>`
- `rewriteMarkdownLinks(markdown: string, context: RewriteContext): RewriteResult`
- `enrichSourceLinks(markdown: string, metadata: WikiMetadata): RewriteResult`

Rules must match the approved spec.

- [ ] **Step 6: Run the tests to verify they pass**

Run:

```bash
npm run test -- tests/unit/filenames.test.ts tests/unit/links.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit the rewrite modules**

Run:

```bash
git add src/core/filenames.ts src/core/links.ts tests/unit/filenames.test.ts tests/unit/links.test.ts
git commit -m "feat: add filename and markdown rewrite logic"
```

### Task 7: Implement asset extraction and rewrite support

**Files:**
- Create: `src/core/assets.ts`
- Test: `tests/unit/assets.test.ts`

- [ ] **Step 1: Write the failing asset tests**

Cover:

- Markdown image extraction
- simple HTML `img` extraction
- dedupe by URL
- local asset path rewrite

- [ ] **Step 2: Run the asset tests to verify they fail**

Run:

```bash
npm run test -- tests/unit/assets.test.ts
```

Expected: FAIL because asset module does not exist yet.

- [ ] **Step 3: Write minimal asset extraction implementation**

Implement:

- `collectAssetRefs(markdown: string): AssetRef[]`
- `rewriteAssetRefs(markdown: string, mapping: AssetMapping): string`
- helper to derive extension and hashed filename

- [ ] **Step 4: Run the asset tests to verify they pass**

Run:

```bash
npm run test -- tests/unit/assets.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the asset module**

Run:

```bash
git add src/core/assets.ts tests/unit/assets.test.ts
git commit -m "feat: add asset extraction and rewrite support"
```

## Chunk 3: End-to-End Export Pipeline and UI Wiring

### Task 8: Implement archive assembly and export pipeline

**Files:**
- Create: `src/core/archive.ts`
- Create: `src/core/exporter.ts`
- Test: `tests/integration/exporter.test.ts`

- [ ] **Step 1: Write the failing integration test**

The integration test should:

- parse the real fixture
- generate page files and metadata
- simulate asset downloading with deterministic fake fetch responses
- build a ZIP
- inspect ZIP contents

Expected assertions:

- `README.md` exists
- `index.json` exists
- expected page files exist
- warnings are recorded for simulated asset failures

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
npm run test -- tests/integration/exporter.test.ts
```

Expected: FAIL because archive/export pipeline is not implemented yet.

- [ ] **Step 3: Write minimal archive builder**

Implement:

- `buildExportReadme(...)`
- `buildExportIndex(...)`
- `buildZipArchive(...)`

Use JSZip and include:

- `README.md`
- `index.json`
- `pages/*`
- `assets/*`

- [ ] **Step 4: Write minimal exporter implementation**

Implement:

- root HTML fetch with retry
- parser invocation
- link and source enrichment
- asset discovery and dedupe
- asset download with retry and warning capture
- ZIP assembly

- [ ] **Step 5: Run the integration test to verify it passes**

Run:

```bash
npm run test -- tests/integration/exporter.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the export pipeline**

Run:

```bash
git add src/core/archive.ts src/core/exporter.ts tests/integration/exporter.test.ts
git commit -m "feat: build deepwiki export pipeline"
```

### Task 9: Wire the popup to the worker and Chrome APIs

**Files:**
- Create: `src/core/chrome.ts`
- Modify: `src/background/index.ts`
- Modify: `src/popup/App.ts`
- Modify: `src/popup/main.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing behavior expectation**

Expected behavior:

- popup disables export on unsupported tab
- popup starts export on supported DeepWiki page
- worker reports progress
- worker triggers download when export completes

- [ ] **Step 2: Implement Chrome API wrappers**

Add helpers for:

- reading the active tab URL
- sending messages
- tracking transient export progress in `chrome.storage.session` or in-memory worker state
- initiating `chrome.downloads.download`
- requesting optional host permissions for external asset origins when needed

- [ ] **Step 3: Implement popup project detection and progress rendering**

Popup responsibilities:

- inspect active tab URL
- render disabled/supported states
- send `START_EXPORT`
- subscribe to or poll worker progress state

- [ ] **Step 4: Implement worker orchestration**

Worker responsibilities:

- accept export requests
- normalize current tab to project root
- call exporter
- update progress states
- create blob URL and start download

- [ ] **Step 5: Run the build to verify the extension compiles**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 6: Commit popup/worker wiring**

Run:

```bash
git add src/core/chrome.ts src/background/index.ts src/popup/App.ts src/popup/main.ts
git commit -m "feat: wire popup to export workflow"
```

### Task 10: Run the full test suite and perform manual verification

**Files:**
- Modify: any files required to fix verified failures
- Test: full suite and built extension output

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm run test
```

Expected: PASS

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS with `dist/` ready to load in Chrome.

- [ ] **Step 3: Load the extension manually in Chrome developer mode**

Manual procedure:

1. Open `chrome://extensions`
2. Enable developer mode
3. Load unpacked `dist/`
4. Open `https://deepwiki.com/NousResearch/hermes-agent-self-evolution`
5. Click the extension action
6. Start export

- [ ] **Step 4: Verify the downloaded ZIP output**

Check:

- file downloads successfully
- archive contains `README.md`, `index.json`, `pages/`, `assets/`
- local Markdown cross-links are rewritten
- offline images render when available
- warnings are present for any simulated or real failed assets

- [ ] **Step 5: Fix any verified defects and re-run tests/build**

After each bug fix, re-run:

```bash
npm run test
npm run build
```

Expected: PASS

- [ ] **Step 6: Commit verification fixes**

Run:

```bash
git add .
git commit -m "fix: finalize deepwiki downloader extension"
```
