import { collectAssetRefs, rewriteAssetRefs } from "./assets";
import { buildZipArchive } from "./archive";
import { pageFileName } from "./filenames";
import {
  buildPagePathMap,
  enrichSourceLinks,
  rewriteMarkdownLinks,
  transformRelevantSourceFilesBlock,
} from "./links";
import { parseEmbeddedWiki } from "./parser";
import type { DeepWikiProjectRef, ExportWarning } from "../shared/types";

export interface AssetDownloadResult {
  bytes: Uint8Array;
  contentType: string | null;
}

export interface ExportWikiFromHtmlInput {
  html: string;
  project: DeepWikiProjectRef;
  fetchAsset: (url: string) => Promise<AssetDownloadResult>;
}

export interface ExportWikiFromHtmlResult {
  zipBytes: Uint8Array;
  pageCount: number;
  warningCount: number;
}

export interface ExportMergedMarkdownFromHtmlInput {
  html: string;
  project: DeepWikiProjectRef;
}

export interface ExportMergedMarkdownFromHtmlResult {
  fileName: string;
  markdown: string;
  pageCount: number;
  warningCount: number;
}

function inferAssetExtension(url: string, contentType: string | null): string {
  const urlMatch = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();

  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/jpeg") return "jpg";

  return "bin";
}

function hashAssetUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }

  return hash.toString(16);
}

interface PreparedPageFile {
  path: string;
  pageId: string;
  title: string;
  content: string;
}

function preparePageFiles(
  input: ExportWikiFromHtmlInput,
): {
  pageFiles: PreparedPageFile[];
  assetFiles: Array<{ path: string; content: Uint8Array }>;
  warnings: ExportWarning[];
  metadata: ReturnType<typeof parseEmbeddedWiki>["metadata"];
} | Promise<{
  pageFiles: PreparedPageFile[];
  assetFiles: Array<{ path: string; content: Uint8Array }>;
  warnings: ExportWarning[];
  metadata: ReturnType<typeof parseEmbeddedWiki>["metadata"];
}> {
  const parsed = parseEmbeddedWiki(input.html);
  const pagePathMap = buildPagePathMap(parsed.pages, input.project);
  const warnings: ExportWarning[] = [];
  const assetMapping = new Map<string, string>();
  const assetFiles: Array<{ path: string; content: Uint8Array }> = [];

  const assetWork = async () => {
    for (const page of parsed.pages) {
      const assets = collectAssetRefs(page.content);

      for (const asset of assets) {
        if (assetMapping.has(asset.originalUrl)) continue;

        try {
          const downloaded = await input.fetchAsset(asset.originalUrl);
          const extension = inferAssetExtension(asset.originalUrl, downloaded.contentType);
          const assetPath = `assets/${hashAssetUrl(asset.originalUrl)}.${extension}`;
          assetMapping.set(asset.originalUrl, `../${assetPath}`);
          assetFiles.push({
            path: assetPath,
            content: downloaded.bytes,
          });
        } catch (error) {
          warnings.push({
            code: "ASSET_DOWNLOAD_FAILED",
            message: `Failed to download asset ${asset.originalUrl}: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }

    const pageFiles = parsed.pages.map((page) => {
      const transformedRelevantFiles = transformRelevantSourceFilesBlock(
        page.content,
        parsed.metadata,
      );
      const rewrittenLinks = rewriteMarkdownLinks(transformedRelevantFiles.markdown, { pagePathMap });
      const enrichedSources = enrichSourceLinks(rewrittenLinks.markdown, parsed.metadata);
      const rewrittenAssets = rewriteAssetRefs(enrichedSources.markdown, assetMapping);

      warnings.push(
        ...transformedRelevantFiles.warnings,
        ...rewrittenLinks.warnings,
        ...enrichedSources.warnings,
      );

      return {
        path: `pages/${pageFileName(page.id, page.title)}`,
        pageId: page.id,
        title: page.title,
        content: rewrittenAssets,
      };
    });

    return {
      pageFiles,
      assetFiles,
      warnings,
      metadata: parsed.metadata,
    };
  };

  return assetWork();
}

export async function exportWikiFromHtml(
  input: ExportWikiFromHtmlInput,
): Promise<ExportWikiFromHtmlResult> {
  const { pageFiles, assetFiles, warnings, metadata } = await preparePageFiles(input);

  const readme = `# DeepWiki Export

- Source: ${input.project.projectUrl}
- Repository: ${metadata.repoName}
- Commit: ${metadata.commitHash ?? "unknown"}
- Generated At: ${metadata.generatedAt ?? "unknown"}
- Page Count: ${pageFiles.length}
- Asset Count: ${assetFiles.length}
- Warning Count: ${warnings.length}
`;

  const indexJson = JSON.stringify(
    {
      project: input.project,
      metadata,
      pageCount: pageFiles.length,
      assetCount: assetFiles.length,
      warnings,
      pages: pageFiles.map((page) => ({
        id: page.pageId,
        title: page.title,
        path: page.path,
      })),
    },
    null,
    2,
  );

  const zipBytes = await buildZipArchive([
    { path: "README.md", content: readme },
    { path: "index.json", content: indexJson },
    ...pageFiles,
    ...assetFiles,
  ]);

  return {
    zipBytes,
    pageCount: pageFiles.length,
    warningCount: warnings.length,
  };
}

export async function exportMergedMarkdownFromHtml(
  input: ExportMergedMarkdownFromHtmlInput,
): Promise<ExportMergedMarkdownFromHtmlResult> {
  const noopFetchAsset = async (): Promise<AssetDownloadResult> => {
    throw new Error("Merged markdown export does not download assets");
  };

  const { pageFiles, warnings } = await preparePageFiles({
    ...input,
    fetchAsset: noopFetchAsset,
  });

  const markdown = pageFiles
    .map((page, index) => {
      const prefix = `<!-- DeepWiki page: ${page.pageId} ${page.title} -->\n\n`;
      const separator = index === 0 ? "" : "\n\n---\n\n";
      return `${separator}${prefix}${page.content}`;
    })
    .join("");

  return {
    fileName: `${input.project.org}-${input.project.repo}-deepwiki.md`,
    markdown,
    pageCount: pageFiles.length,
    warningCount: warnings.length,
  };
}
