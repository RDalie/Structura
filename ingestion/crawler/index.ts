import fs from "fs";
import path from "path";

type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "java"
  | "ruby"
  | "php"
  | "rust"
  | "csharp";

type CrawlOptions = {
  extensions?: Iterable<string>;
  languages?: SupportedLanguage[];
};

// Language-to-extension map so ingestion can request specific stacks.
export const LANGUAGE_EXTENSION_MAP: Record<SupportedLanguage, string[]> = {
  javascript: [".js", ".mjs", ".cjs"],
  typescript: [".ts", ".tsx"],
  python: [".py"],
  go: [".go"],
  java: [".java"],
  ruby: [".rb"],
  php: [".php"],
  rust: [".rs"],
  csharp: [".cs"],
};

// Recursively walk a directory tree, honoring ignore rules and collecting matches.
async function crawlDir(
  dir: string,
  results: string[],
  ignoreFolders: Set<string>,
  extensions: Set<string>
) {
  let items: string[];
  try {
    items = await fs.promises.readdir(dir);
  } catch (error) {
    console.error(`Failed to read directory: ${dir}`, error);
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
    } catch (error) {
      console.error(`Failed to stat path: ${fullPath}`, error);
      continue;
    }

    if (stats.isDirectory()) {
      await crawlDir(fullPath, results, ignoreFolders, extensions);
      continue;
    }

    const ext = path.extname(fullPath).toLowerCase();
    if (extensions.has(ext)) {
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
  } catch (error) {
    // If the ignore file is missing or unreadable, fall back to defaults.
    console.warn("Ignoring custom folder list; using defaults only.", error);
  }

  return ignore;
}

// Check whether any path segment is in the ignore list.
function shouldIgnore(fullPath: string, ignoreFolders: Set<string>): boolean {
  return fullPath.split(path.sep).some((segment) => ignoreFolders.has(segment));
}

// Public API: crawl and return matching file paths.
export async function crawlFiles(root: string, options?: CrawlOptions): Promise<string[]> {
  const ignoreFolders = await loadIgnoreFolders();
  const results: string[] = [];
  const extensions = resolveExtensions(options);
  await crawlDir(root, results, ignoreFolders, extensions);
  return results;
}

// Backward-compatible helper for JS/TS callers.
export async function crawlJsFiles(root: string): Promise<string[]> {
  return crawlFiles(root, { languages: ["javascript", "typescript"] });
}

function resolveExtensions(options?: CrawlOptions): Set<string> {
  if (options?.extensions) {
    return new Set(Array.from(options.extensions, (ext) => ext.toLowerCase()));
  }

  if (options?.languages && options.languages.length > 0) {
    return new Set(
      options.languages.flatMap((lang) => LANGUAGE_EXTENSION_MAP[lang] ?? []).map((ext) => ext.toLowerCase())
    );
  }

  // Default to JS/TS if nothing is specified.
  return new Set([...LANGUAGE_EXTENSION_MAP.javascript, ...LANGUAGE_EXTENSION_MAP.typescript].map((ext) => ext.toLowerCase()));
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
