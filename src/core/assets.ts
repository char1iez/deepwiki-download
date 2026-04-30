export interface AssetRef {
  originalUrl: string;
}

export function collectAssetRefs(markdown: string): AssetRef[] {
  const urls: string[] = [];

  for (const match of markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    urls.push(match[1]);
  }

  for (const match of markdown.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/g)) {
    urls.push(match[1]);
  }

  return [...new Set(urls)].map((originalUrl) => ({ originalUrl }));
}

export function rewriteAssetRefs(
  markdown: string,
  mapping: Map<string, string>,
): string {
  let rewritten = markdown;

  for (const [originalUrl, localPath] of mapping.entries()) {
    rewritten = rewritten
      .replaceAll(`](${originalUrl})`, `](${localPath})`)
      .replaceAll(`src="${originalUrl}"`, `src="${localPath}"`);
  }

  return rewritten;
}
