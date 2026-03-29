import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const indexFile = path.join(srcDir, "index.css");

async function getCssFiles(dirPath, importBase) {
  let entries = [];

  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => `${importBase}/${entry.name}`)
    .sort((a, b) => a.localeCompare(b));
}

export async function generateIndex() {
  const baseImports = await getCssFiles(path.join(srcDir, "base"), "./base");
  const utilityImports = await getCssFiles(path.join(srcDir, "utilities"), "./utilities");

  const allImports = [...baseImports, ...utilityImports];
  const content = allImports.map((file) => `@import "${file}";`).join("\n") + "\n";

  await writeFile(indexFile, content, "utf8");

  console.log("Generated: src/index.css");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateIndex().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}