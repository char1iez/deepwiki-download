import { pageFileName, sanitizeTitleForFilename } from "./filenames";
import type { DeepWikiProjectRef, ExportWarning, WikiMetadata, WikiPage } from "../shared/types";

export interface RewriteResult {
  markdown: string;
  warnings: ExportWarning[];
}

export interface RewriteContext {
  pagePathMap: Map<string, string>;
}

export function buildPagePathMap(
  pages: WikiPage[],
  project: DeepWikiProjectRef,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const page of pages) {
    const path = `./${pageFileName(page.id, page.title)}`;
    const slug = `${page.id}-${sanitizeTitleForFilename(page.title)}`;

    map.set(page.id, path);
    map.set(
      `https://deepwiki.com/${project.org}/${project.repo}/${slug}`,
      path,
    );
    map.set(`/${project.org}/${project.repo}/${slug}`, path);
  }

  return map;
}

export function rewriteMarkdownLinks(
  markdown: string,
  context: RewriteContext,
): RewriteResult {
  const warnings: ExportWarning[] = [];

  const rewritten = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, target) => {
    if (target.startsWith("#") && /^#\d/.test(target)) {
      const mapped = context.pagePathMap.get(target.slice(1));
      if (mapped) return `[${label}](${mapped})`;
      warnings.push({ code: "UNRESOLVED_PAGE_REF", message: `Could not resolve page reference ${target}` });
      return `[${label}](${target})`;
    }

    if (target.startsWith("#")) {
      return `[${label}](${target})`;
    }

    const [pathPart, anchor] = target.split("#");
    const mapped = context.pagePathMap.get(pathPart);
    if (mapped) {
      return `[${label}](${anchor ? `${mapped}#${anchor}` : mapped})`;
    }

    return `[${label}](${target})`;
  });

  return { markdown: rewritten, warnings };
}

export function enrichSourceLinks(markdown: string, metadata: WikiMetadata): RewriteResult {
  const warnings: ExportWarning[] = [];

  if (!metadata.repoName || !metadata.commitHash) {
    return { markdown, warnings };
  }

  const rewritten = markdown.replace(
    /\[([^:\]]+):(\d+)-(\d+)\]\(\)/g,
    (_match, filePath, startLine, endLine) => {
      const url = `https://github.com/${metadata.repoName}/blob/${metadata.commitHash}/${filePath}?plain=1#L${startLine}-L${endLine}`;
      return `[${filePath}:${startLine}-${endLine}](${url})`;
    },
  );

  return { markdown: rewritten, warnings };
}

export function transformRelevantSourceFilesBlock(
  markdown: string,
  metadata: WikiMetadata,
): RewriteResult {
  const warnings: ExportWarning[] = [];

  if (!metadata.repoName || !metadata.commitHash) {
    return { markdown, warnings };
  }

  const detailsPattern =
    /<details>\n<summary>Relevant source files<\/summary>\n\nThe following files were used as context for generating this wiki page:\n\n([\s\S]*?)\n<\/details>/;

  const match = markdown.match(detailsPattern);
  if (!match) {
    return { markdown, warnings };
  }

  const listBody = match[1];
  const fileLines = [...listBody.matchAll(/- \[([^\]]+)\]\(([^)]+)\)/g)].map(
    ([, label, href]) => {
      const resolvedHref =
        href.startsWith("http://") || href.startsWith("https://")
          ? href
          : `https://github.com/${metadata.repoName}/blob/${metadata.commitHash}/${href}`;

      return `- [${label}](${resolvedHref})`;
    },
  );

  const replacement = [
    "## Relevant source files",
    "",
    ...fileLines,
  ].join("\n");

  return {
    markdown: markdown.replace(detailsPattern, replacement),
    warnings,
  };
}
