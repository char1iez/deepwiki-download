export interface DeepWikiProjectRef {
  org: string;
  repo: string;
  projectUrl: string;
}

export interface WikiMetadata {
  repoName: string;
  commitHash: string | null;
  generatedAt: string | null;
}

export interface WikiPage {
  id: string;
  title: string;
  sourcePath: string;
  content: string;
}

export interface ExportWarning {
  code: string;
  message: string;
}

export interface ExportProgress {
  stage:
    | "idle"
    | "fetching"
    | "parsing"
    | "rewriting"
    | "downloading-assets"
    | "building-zip"
    | "complete"
    | "error";
  message: string;
  completed?: number;
  total?: number;
}

export interface ExportSuccess {
  fileName: string;
  warningCount: number;
}

export interface ExportFailure {
  error: string;
}
