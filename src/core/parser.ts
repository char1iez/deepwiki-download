import { extractFlightPushPayloads } from "./flight";
import type { WikiMetadata, WikiPage } from "../shared/types";

export interface ParsedWiki {
  metadata: WikiMetadata;
  pages: WikiPage[];
}

function buildRecordMap(joinedPayload: string): Map<string, string> {
  const records = joinedPayload.split(/\n(?=[0-9a-z]+:)/g);
  const map = new Map<string, string>();

  for (const record of records) {
    const separatorIndex = record.indexOf(":");
    if (separatorIndex <= 0) continue;

    const key = record.slice(0, separatorIndex);
    const value = record.slice(separatorIndex + 1);
    map.set(key, value);
  }

  return map;
}

function resolveContent(recordMap: Map<string, string>, recordId: string): string {
  const record = recordMap.get(recordId);
  if (!record) {
    throw new Error(`Unable to resolve content reference: ${recordId}`);
  }

  return record.replace(/^T[0-9a-f]+,\n/i, "");
}

export function parseEmbeddedWiki(html: string): ParsedWiki {
  const joinedPayload = extractFlightPushPayloads(html).join("\n");
  const recordMap = buildRecordMap(joinedPayload);

  const metadataMatch = joinedPayload.match(
    /"wiki":\{"metadata":\{"repo_name":"([^"]+)","commit_hash":"([^"]+)","generated_at":"([^"]+)","config":null,"config_source":"([^"]+)"\},"pages":\[(.*?)\]\}/s,
  );

  if (!metadataMatch) {
    throw new Error("Unable to locate embedded wiki payload");
  }

  const [, repoName, commitHash, generatedAt, , pagesSource] = metadataMatch;

  const metadata: WikiMetadata = {
    repoName,
    commitHash,
    generatedAt,
  };

  const pages: WikiPage[] = [];
  const pagePattern =
    /\{"page_plan":\{"id":"([^"]+)","title":"([^"]+)"\},"content":"\$([^"]+)"\}/g;

  for (const match of pagesSource.matchAll(pagePattern)) {
    const [, id, title, contentRecordId] = match;
    pages.push({
      id,
      title,
      sourcePath: `${id}-${title}`,
      content: resolveContent(recordMap, contentRecordId),
    });
  }

  if (pages.length === 0) {
    throw new Error("Embedded wiki payload contained no pages");
  }

  return {
    metadata,
    pages,
  };
}
