export function sanitizeTitleForFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function pageFileName(pageId: string, title: string): string {
  return `${pageId}-${sanitizeTitleForFilename(title)}.md`;
}
