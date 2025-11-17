import fs from "fs";
import path from "path";

// File extensions to collect while crawling.
const JS_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".tsx"]);

// Recursively walk a directory tree, honoring ignore rules and collecting matches.
async function crawlDir(dir: string, results: string[], ignoreFolders: Set<string>) {
  let items: string[];
  try {
    items = await fs.promises.readdir(dir);
  } catch {
    return;
  }

  for (const item of items) {
    const fullPath = path.join(dir, item);

    if (shouldIgnore(fullPath, ignoreFolders)) {
      continue;
    }

    let stats: fs.Stats;
    try {
      stats = await fs.promises.stat(fullPath);
    } catch {
      continue;
    }

    if (stats.isDirectory()) {
      await crawlDir(fullPath, results, ignoreFolders);
      continue;
    }

    const ext = path.extname(fullPath);
    if (JS_EXTENSIONS.has(ext)) {
      const normalized = fullPath.replace(/\\/g, "/");
      results.push(normalized);
    }
  }
}

// Build the set of folders to ignore from defaults plus optional file.
async function loadIgnoreFolders(): Promise<Set<string>> {
  const defaults = ["node_modules", "dist", "build", "coverage", ".git"];
  const ignore = new Set<string>(defaults);

  try {
    const file = await fs.promises.readFile(path.join(__dirname, "ignore-folders.txt"), "utf8");
    file
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .forEach((folder) => ignore.add(folder));
  } catch {
    // If the ignore file is missing or unreadable, fall back to defaults.
  }

  return ignore;
}

// Check whether any path segment is in the ignore list.
function shouldIgnore(fullPath: string, ignoreFolders: Set<string>): boolean {
  return fullPath.split(path.sep).some((segment) => ignoreFolders.has(segment));
}

// Public API: crawl and return matching file paths.
export async function crawlJsFiles(root: string): Promise<string[]> {
  const ignoreFolders = await loadIgnoreFolders();
  const results: string[] = [];
  await crawlDir(root, results, ignoreFolders);
  return results;
}

// Test run
// (async () => {
//   try {
//     const files = await crawlJsFiles("./");
//     console.log(files);
//   } catch (error) {
//     console.error(error);
//   }
// })();
