# DeepWiki Downloader Chrome Extension Design

## Goal

Build a local Chrome Extension that exports the full documentation set for the currently open DeepWiki project into a downloadable ZIP archive containing:

- all wiki pages as Markdown files
- downloaded image assets for offline reading
- rewritten local relative links between exported pages
- export metadata for traceability and later processing

The extension should work for any DeepWiki project page under `https://deepwiki.com/<org>/<repo>` and should trigger only when the user is already browsing that project.

## Scope

### In Scope

- Manifest V3 Chrome Extension
- Trigger from the extension popup while browsing a DeepWiki project page
- Fetch the project root DeepWiki HTML and parse embedded wiki data
- Export all pages found in the embedded wiki payload
- Rewrite DeepWiki internal page links to local relative Markdown links
- Download image assets referenced by exported Markdown or simple HTML image tags
- Package output as a single ZIP file
- Include warnings for partial asset failures without aborting the full export

### Out of Scope

- DOM scraping as a primary or fallback extraction strategy
- Manual URL input in the popup
- Exporting arbitrary websites
- Syncing updates incrementally between exports
- Preserving DeepWiki's rendered HTML appearance
- Downloading every external asset from arbitrary third-party domains

## Product Constraints

- The extension is activated only from the current browser tab context.
- The extension should reject non-DeepWiki tabs with a clear disabled state.
- The export must fail hard if the full wiki page set cannot be reconstructed.
- The export may continue when individual images fail to download, but those failures must be reported.
- The result should be portable across common operating systems after ZIP extraction.

## User Experience

The popup is intentionally minimal.

- When the active tab is not a DeepWiki project page, the popup shows a disabled state with guidance to open a DeepWiki project first.
- When the active tab is a supported page, the popup shows the detected project name and a single `Download full wiki` action.
- During execution, the popup shows progress states such as:
  - `Fetching wiki`
  - `Parsing embedded data`
  - `Rewriting links`
  - `Downloading images (n/N)`
  - `Building zip`
- On success, the popup shows the generated ZIP filename.
- On failure, the popup shows a short actionable error message.

The popup does not accept free-form input and does not expose configuration knobs in the first version.

## Architecture

The extension is split into four responsibilities.

### Popup

- Detects whether the active tab URL matches a supported DeepWiki project page
- Starts the export workflow through message passing
- Renders progress and final status

### Service Worker

- Owns the export workflow
- Fetches the DeepWiki root page HTML
- Invokes the parser, rewriters, asset downloader, and ZIP builder
- Persists transient progress state for the popup
- Starts the browser download via the Downloads API

### Core Export Library

Pure TypeScript modules that do not depend on the popup UI:

- active-tab URL normalization
- DeepWiki HTML parser
- embedded wiki payload resolver
- local filename and path generation
- Markdown link rewriting
- image reference collection and asset download mapping
- ZIP assembly

### Tests and Fixtures

- real DeepWiki HTML fixtures captured for parser regression coverage
- transformation-focused unit tests for links, filenames, and asset references
- integration tests for end-to-end export packaging using fixtures

## Data Flow

The export pipeline uses a single extraction path.

1. The user opens a DeepWiki project page or one of its subpages.
2. The popup derives the project root URL from the active tab.
3. The service worker fetches the root page HTML for that project.
4. The parser extracts the embedded Next.js Flight payload from `self.__next_f.push(...)` script blocks.
5. The parser resolves:
   - wiki metadata
   - the full page list
   - referenced content nodes for each page
6. The export pipeline produces a normalized internal representation:
   - project metadata
   - ordered page records with page id, title, source URL, and Markdown content
7. The rewriter generates local Markdown files and local asset references.
8. The asset fetcher downloads image resources and maps them into `assets/`.
9. The ZIP builder assembles archive contents and hands the result to `chrome.downloads.download`.

There is no DOM-to-Markdown conversion step in this design.

## DeepWiki Parsing Strategy

The parser relies on DeepWiki's server-delivered embedded wiki data rather than rendered DOM.

### Expected Source Signals

- the project root HTML includes a `wiki` object with metadata and page descriptors
- each page descriptor includes:
  - `page_plan.id`
  - `page_plan.title`
  - a content reference token such as `"$17"`
- the same Flight payload contains content records that must be resolved back to Markdown strings

### Parser Responsibilities

- collect all `self.__next_f.push(...)` fragments in order
- decode escaped payload text into a parseable intermediate representation
- find the root `wiki` payload
- resolve indirect content references into actual Markdown strings
- preserve page order from the source payload
- produce deterministic parser errors when required nodes are missing

### Parser Failure Conditions

The export must stop if any of the following occurs:

- root DeepWiki HTML cannot be fetched after retries
- the `wiki` payload cannot be found
- page count and content references do not reconcile
- any page content cannot be resolved
- parsed output is structurally incomplete

## Export Structure

The ZIP archive layout is:

```text
<org>-<repo>-deepwiki.zip
  README.md
  index.json
  pages/
    1-overview.md
    1.1-getting-started.md
    ...
  assets/
    <hash>.<ext>
```

### README.md

The export README records:

- source DeepWiki project URL
- repository name
- commit hash if available
- generated timestamp from DeepWiki metadata if available
- export timestamp
- page count
- asset count
- warning summary

### index.json

The JSON index records:

- project metadata
- export metadata
- page manifest with source URL and local file path
- asset manifest with original URL and local asset path
- warnings and non-fatal failures

## File Naming Rules

Local filenames must be portable and deterministic.

- base filename format: `<page-id>-<sanitized-title>.md`
- title sanitization removes or replaces path separators, colons, control characters, repeated whitespace, and other filesystem-hostile characters
- sanitized filenames must be safe for common ZIP extraction targets, including Windows
- page ids remain in the filename to preserve source ordering and stable references

The file generator should not trust the DeepWiki route slug as a local filename because route slugs may contain characters that are poor cross-platform filename choices.

## Link Rewriting Rules

Only DeepWiki-internal links are rewritten.

### Rewrite Targets

- absolute DeepWiki page links such as:
  - `https://deepwiki.com/<org>/<repo>/<page-slug>`
- root-relative DeepWiki page links such as:
  - `/<org>/<repo>/<page-slug>`
- DeepWiki page links with anchors such as:
  - `https://deepwiki.com/<org>/<repo>/<page-slug>#section`
- page-number references that behave like cross-page links in DeepWiki source such as:
  - `(#1.1)`

### Rewrite Output

- cross-page links become relative Markdown links such as `./1.1-getting-started.md`
- cross-page links with anchors become `./1.1-getting-started.md#section`
- same-page anchors such as `#overview` remain unchanged
- unresolved DeepWiki page references generate warnings and remain unchanged instead of being rewritten incorrectly

### Non-Rewrite Targets

- external absolute links
- GitHub links already present in the source
- plain text that looks like a URL but is not part of a link token

## Source Reference Enrichment

Some embedded source Markdown appears to contain placeholders such as:

- `Sources: [path/to/file.py:20-27]()`

The exporter should improve these when enough metadata is available.

### Enrichment Rule

- if the current DeepWiki metadata includes `repo_name` and `commit_hash`, convert empty target source references into GitHub blob URLs for that repository and commit
- if required metadata is unavailable or the source reference cannot be parsed, preserve the original Markdown and emit a warning

This is an enhancement, not a hard export requirement.

## Asset Handling

The exporter downloads image assets for offline use.

### Supported Inputs

- Markdown image syntax: `![alt](url)`
- simple HTML image tags with `src=...`

### Asset Rules

- each unique asset URL is downloaded once
- assets are stored under `assets/`
- filenames are generated from content hash plus a derived or inferred extension
- references inside Markdown are rewritten to local relative asset paths
- external-origin images require host access for their origin before the extension can fetch them reliably
- failed asset downloads do not abort the export

### Asset Failure Reporting

For failed downloads:

- keep the original remote URL in Markdown when local replacement is impossible
- record the failure in `index.json`
- summarize failures in `README.md`
- surface a warning state in the popup after the ZIP download starts

## Error Handling

Errors are divided into hard failures and soft failures.

### Hard Failures

These abort the export:

- unsupported active tab URL
- DeepWiki root page fetch failure after retry budget is exhausted
- embedded wiki payload missing or unreadable
- incomplete page reconstruction
- ZIP generation failure

### Soft Failures

These do not abort the export:

- one or more image download failures
- one or more source reference enrichment failures
- one or more malformed optional links

### Retry Policy

- root page HTML fetch: retry twice before failing
- asset fetch: retry once before recording a warning

## Permissions

The first version should aim for the narrowest reasonable permission set.

### permissions

- `activeTab`
- `downloads`
- `storage`

### host_permissions

- `https://deepwiki.com/*`

### optional_host_permissions

- requested at runtime for asset origins discovered in the export payload when those origins are outside `deepwiki.com`

The design intentionally avoids `scripting` unless later implementation details prove it necessary. It also avoids broad permanent host permissions for arbitrary sites by preferring runtime requests for only the image origins actually needed by a given export.

## Proposed Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3
- JSZip
- Vitest

This keeps the project small while still providing fast test feedback and straightforward extension bundling.

## Testing Strategy

Testing should focus on the export core rather than popup cosmetics.

### Unit Tests

- parser extracts metadata, pages, and content from real HTML fixtures
- page content reference resolution works for indirect content tokens
- filename sanitization produces portable output
- DeepWiki internal links are rewritten correctly
- image references are collected and rewritten correctly
- source reference enrichment produces the expected GitHub URLs

### Integration Tests

- run the full export pipeline against a real fixture
- verify the output manifest contains expected page counts and file paths
- verify ZIP contents include:
  - `README.md`
  - `index.json`
  - all page files
  - expected asset files
- verify warnings are surfaced correctly for simulated asset failures

### Manual Acceptance

1. Load the unpacked extension in Chrome developer mode.
2. Open a supported DeepWiki project page.
3. Trigger the export from the popup.
4. Download and extract the ZIP archive.
5. Verify:
   - all expected Markdown files exist
   - internal page links resolve locally
   - downloaded images render offline
   - warning reporting is accurate

## Open Questions Resolved

- Export format: ZIP archive
- Trigger mode: only from the currently open DeepWiki project page
- Extraction strategy: parse embedded wiki data only
- Offline behavior: include images and rewrite local links

## Non-Goals for V1

- fallback DOM scraping
- editable export settings
- automatic scheduled refresh
- selective page export
- packaging as a CLI in addition to the extension

## Implementation Readiness

The design is ready for an implementation plan with focused tasks around:

- project scaffolding
- parser and fixtures
- rewrite and asset modules
- popup and service worker wiring
- end-to-end packaging and verification
