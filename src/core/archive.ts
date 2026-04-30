import JSZip from "jszip";

export interface ArchiveFile {
  path: string;
  content: string | Uint8Array;
}

export async function buildZipArchive(files: ArchiveFile[]): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  return zip.generateAsync({ type: "uint8array" });
}
