import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { crawlFiles, crawlJsFiles, LANGUAGE_EXTENSION_MAP } from "../../ingestion/crawler";

// Helper to make path comparisons OS-agnostic.
const normalize = (p: string) => p.replace(/\\/g, "/");

let tempDir: string;

beforeEach(async () => {
  // Isolated temp directory per test.
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "crawler-test-"));
});

afterEach(async () => {
  if (tempDir) {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

describe("crawlJsFiles", () => {
  it("collects supported extensions and normalizes paths", async () => {
    // Seed a mix of supported and unsupported files across nested folders.
    const files = ["root.ts", "other.js", "notes.txt", path.join("nested", "file.mjs"), path.join("nested", "sub", "file.tsx")];

    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, "// test file");
    }

    const result = await crawlJsFiles(tempDir);

    const expected = ["root.ts", "other.js", path.join("nested", "file.mjs"), path.join("nested", "sub", "file.tsx")].map((p) => normalize(path.join(tempDir, p)));

    // Should only include supported extensions and normalized separators.
    expect(result.sort()).toEqual(expected.sort());
    expect(result.every((p) => p === normalize(p))).toBe(true);
  });

  it("respects ignored folders at any depth", async () => {
    // Create files under allowed and ignored directories (including nested ignores).
    const structure = [
      path.join("keep", "index.js"),
      path.join("keep", "nested", "file.ts"),
      path.join("node_modules", "ignore.js"),
      path.join("src", "node_modules", "ignore.ts"),
      path.join("build", "ignore.mjs"),
      path.join("coverage", "ignore.tsx"),
      path.join("deep", "dist", "ignore.js"),
    ];

    for (const file of structure) {
      const fullPath = path.join(tempDir, file);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, "// test file");
    }

    const result = await crawlJsFiles(tempDir);

    const expected = [
      normalize(path.join(tempDir, "keep", "index.js")),
      normalize(path.join(tempDir, "keep", "nested", "file.ts")),
    ];

    // Only files outside ignored folders should be present.
    expect(result.sort()).toEqual(expected.sort());
  });
});

describe("crawlFiles", () => {
  it("supports language-based extension sets", async () => {
    const files = ["app.py", "main.go", "handler.js", "component.tsx"];

    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      await fs.promises.writeFile(fullPath, "// test file");
    }

    const pythonOnly = await crawlFiles(tempDir, { languages: ["python"] });
    expect(pythonOnly).toEqual([normalize(path.join(tempDir, "app.py"))]);

    const goAndJsTs = await crawlFiles(tempDir, { languages: ["go", "javascript", "typescript"] });
    const expected = ["main.go", "handler.js", "component.tsx"].map((p) => normalize(path.join(tempDir, p)));
    expect(goAndJsTs.sort()).toEqual(expected.sort());
  });

  it("accepts explicit extensions overriding language defaults", async () => {
    const files = ["file.xyz", "file.rs"];
    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      await fs.promises.writeFile(fullPath, "// test file");
    }

    const result = await crawlFiles(tempDir, { extensions: [".xyz"] });
    expect(result).toEqual([normalize(path.join(tempDir, "file.xyz"))]);

    // Verify the language map remains available for callers.
    expect(LANGUAGE_EXTENSION_MAP.rust).toContain(".rs");
  });
});
