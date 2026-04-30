import type { DeepWikiProjectRef } from "../shared/types";

const DEEPWIKI_HOSTNAME = "deepwiki.com";

export function parseDeepWikiUrl(rawUrl: string): DeepWikiProjectRef | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== DEEPWIKI_HOSTNAME) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [org, repo] = segments;
  return {
    org,
    repo,
    projectUrl: `https://${DEEPWIKI_HOSTNAME}/${org}/${repo}`,
  };
}

export function isSupportedDeepWikiUrl(rawUrl: string): boolean {
  return parseDeepWikiUrl(rawUrl) !== null;
}
