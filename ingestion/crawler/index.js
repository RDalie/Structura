"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlJsFiles = exports.crawlFiles = exports.LANGUAGE_EXTENSION_MAP = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Language-to-extension map so ingestion can request specific stacks.
exports.LANGUAGE_EXTENSION_MAP = {
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
async function crawlDir(dir, results, ignoreFolders, extensions) {
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
            await crawlDir(fullPath, results, ignoreFolders, extensions);
            continue;
        }
        const ext = path_1.default.extname(fullPath).toLowerCase();
        if (extensions.has(ext)) {
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
function resolveExtensions(options) {
    var _a;
    if (options === null || options === void 0 ? void 0 : options.extensions) {
        return new Set(Array.from(options.extensions, (ext) => ext.toLowerCase()));
    }
    if ((options === null || options === void 0 ? void 0 : options.languages) && options.languages.length > 0) {
        return new Set(options.languages
            .flatMap((lang) => { var _a; return (_a = exports.LANGUAGE_EXTENSION_MAP[lang]) !== null && _a !== void 0 ? _a : []; })
            .map((ext) => ext.toLowerCase()));
    }
    // Default to JS/TS if nothing is specified.
    return new Set([...exports.LANGUAGE_EXTENSION_MAP.javascript, ...exports.LANGUAGE_EXTENSION_MAP.typescript].map((ext) => ext.toLowerCase()));
}
// Public API: crawl and return matching file paths.
async function crawlFiles(root, options) {
    const ignoreFolders = await loadIgnoreFolders();
    const results = [];
    const extensions = resolveExtensions(options);
    await crawlDir(root, results, ignoreFolders, extensions);
    return results;
}
exports.crawlFiles = crawlFiles;
// Backward-compatible helper for JS/TS callers.
async function crawlJsFiles(root) {
    return crawlFiles(root, { languages: ["javascript", "typescript"] });
}
exports.crawlJsFiles = crawlJsFiles;
// Test run
// (async () => {
//   try {
//     const files = await crawlJsFiles("./");
//     console.log(files);
//   } catch (error) {
//     console.error(error);
//   }
// })();
