"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlJsFiles = crawlJsFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// File extensions to collect while crawling.
const JS_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".tsx"]);
// Recursively walk a directory tree, honoring ignore rules and collecting matches.
async function crawlDir(dir, results, ignoreFolders) {
    let items;
    try {
        items = await fs_1.default.promises.readdir(dir);
    }
    catch (error) {
        console.error(`Failed to read directory: ${dir}`, error);
        return;
    }
    for (const item of items) {
        const fullPath = path_1.default.join(dir, item);
        if (shouldIgnore(fullPath, ignoreFolders)) {
            continue;
        }
        let stats;
        try {
            stats = await fs_1.default.promises.stat(fullPath);
        }
        catch (error) {
            console.error(`Failed to stat path: ${fullPath}`, error);
            continue;
        }
        if (stats.isDirectory()) {
            await crawlDir(fullPath, results, ignoreFolders);
            continue;
        }
        const ext = path_1.default.extname(fullPath);
        if (JS_EXTENSIONS.has(ext)) {
            const normalized = fullPath.replace(/\\/g, "/");
            results.push(normalized);
        }
    }
}
// Build the set of folders to ignore from defaults plus optional file.
async function loadIgnoreFolders() {
    const defaults = ["node_modules", "dist", "build", "coverage", ".git"];
    const ignore = new Set(defaults);
    try {
        const file = await fs_1.default.promises.readFile(path_1.default.join(__dirname, "ignore-folders.txt"), "utf8");
        file
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"))
            .forEach((folder) => ignore.add(folder));
    }
    catch (error) {
        // If the ignore file is missing or unreadable, fall back to defaults.
        console.warn("Ignoring custom folder list; using defaults only.", error);
    }
    return ignore;
}
// Check whether any path segment is in the ignore list.
function shouldIgnore(fullPath, ignoreFolders) {
    return fullPath.split(path_1.default.sep).some((segment) => ignoreFolders.has(segment));
}
// Public API: crawl and return matching file paths.
async function crawlJsFiles(root) {
    const ignoreFolders = await loadIgnoreFolders();
    const results = [];
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
