import path from 'node:path';

// Extension inference widens a bare specifier into realistic file candidates.
// Order matters: prefer source-like extensions before build artifacts, and keep ordering stable for predictable resolution.
// These helpers are pure and exportable so other resolvers (Node-style, TS path aliases, absolute imports) can reuse them.
const EXTENSION_ORDER = ['', '.js', '.ts', '.jsx', '.tsx', '.cjs', '.mjs'];
const INDEX_EXTENSION_ORDER = ['.js', '.ts', '.jsx', '.tsx', '.cjs', '.mjs'];

// Generate candidate file paths by applying known extensions to a base path.
// Consumers perform their own filesystem checks; this function is pure.
export function inferFileExtensions(basePath: string): string[] {
  return EXTENSION_ORDER.map((ext) => (ext ? `${basePath}${ext}` : basePath));
}

// Generate candidate index file paths inside a directory.
// Useful when the specifier points at a folder rather than a concrete file.
export function inferDirectoryIndexFiles(dirPath: string): string[] {
  return INDEX_EXTENSION_ORDER.map((ext) => path.join(dirPath, `index${ext}`));
}
