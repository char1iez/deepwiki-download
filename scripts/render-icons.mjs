import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const DEFAULT_SIZES = [128];
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

export async function renderIcons({
  inputPath = resolve(projectRoot, "public/icon.svg"),
  outputDir = resolve(projectRoot, "public/icons"),
  sizes = DEFAULT_SIZES,
} = {}) {
  const svg = await readFile(inputPath, "utf8");

  await mkdir(outputDir, { recursive: true });

  await Promise.all(
    sizes.map(async (size) => {
      const resvg = new Resvg(svg, {
        fitTo: {
          mode: "width",
          value: size,
        },
      });
      const pngData = resvg.render().asPng();

      await writeFile(join(outputDir, `icon-${size}.png`), pngData);
    }),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await renderIcons();
}
