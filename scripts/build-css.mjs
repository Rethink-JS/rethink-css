import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateIndex } from "./generate-index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcFile = path.join(rootDir, "src", "index.css");
const distDir = path.join(rootDir, "dist");
const distFile = path.join(distDir, "rethink.css");
const distMinFile = path.join(distDir, "rethink.min.css");
const packageJsonFile = path.join(rootDir, "package.json");

async function resolveImports(filePath, seen = new Set()) {
  const normalizedPath = path.normalize(filePath);

  if (seen.has(normalizedPath)) {
    return "";
  }

  seen.add(normalizedPath);

  let raw;

  try {
    raw = await readFile(normalizedPath, "utf8");
  } catch (err) {
    console.error(`Missing file: ${normalizedPath}`);
    throw err;
  }

  const importRegex = /^\s*@import\s+["'](.+?)["'];\s*$/gm;

  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = importRegex.exec(raw)) !== null) {
    output += raw.slice(lastIndex, match.index);

    const relativeImport = match[1];
    const importedFilePath = path.resolve(
      path.dirname(normalizedPath),
      relativeImport,
    );
    const importedContent = await resolveImports(importedFilePath, seen);

    output += importedContent;
    lastIndex = importRegex.lastIndex;
  }

  output += raw.slice(lastIndex);

  return output;
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function cleanReadableCss(css) {
  return css
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getPackageMeta() {
  const raw = await readFile(packageJsonFile, "utf8");
  const pkg = JSON.parse(raw);

  return {
    version: pkg.version || "0.0.0",
    license: pkg.license || "UNLICENSED",
  };
}

function createBanner(version, license) {
  return `/*! @rethink-js/rethink-css v${version} | ${license} */`;
}

async function build() {
  await generateIndex();
  await mkdir(distDir, { recursive: true });

  const { version, license } = await getPackageMeta();
  const bundledCss = await resolveImports(srcFile);

  const banner = createBanner(version, license);

  const readableCss = banner + "\n" + cleanReadableCss(bundledCss) + "\n";

  const minifiedCss = banner + minifyCss(bundledCss) + "\n";

  await writeFile(distFile, readableCss, "utf8");
  await writeFile(distMinFile, minifiedCss, "utf8");

  console.log("Built: dist/rethink.css");
  console.log("Built: dist/rethink.min.css");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
