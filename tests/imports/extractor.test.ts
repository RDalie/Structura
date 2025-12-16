import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { extractImportsFromModule } from '../../core/imports/extractor';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';
import type { ModuleNode, NormalizedNode } from '../../core/types/ast';
import { parseJSFile } from '../../ingestion/parser/js/parseFile';

async function parseAndNormalizeModule(source: string, ext = '.js'): Promise<ModuleNode> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imports-test-'));
  const filePath = path.join(tmpDir, `test${ext}`);
  fs.writeFileSync(filePath, source, 'utf8');
  const parseResult = await parseJSFile(filePath);
  if (!parseResult.tree) throw new Error('Parse failed');
  const root: NormalizedNode = normalize(
    parseResult.tree.rootNode,
    source,
    filePath,
    SNAPSHOT_VERSION
  );
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (root.type !== 'Module') throw new Error('Expected Module root');
  return root;
}

async function runExtract(source: string, ext = '.js') {
  const module = await parseAndNormalizeModule(source, ext);
  return extractImportsFromModule(module, source);
}

describe('import extractor', () => {
  it('handles default ES module import', async () => {
    const source = `import axios from "axios";`;
    const result = await runExtract(source);
    expect(result.imports).toHaveLength(1);
    const imp = result.imports[0];
    expect(imp.kind).toBe('es6');
    expect(imp.module).toBe('axios');
    expect(imp.importedNames).toEqual(['axios']);
    expect(imp.line).toBe(1);
    expect(imp.raw).toBe(source);
  });

  it('handles named ES module imports', async () => {
    const source = `import { AxiosError, AxiosHeaders } from "./core/index.js";`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('es6');
    expect(imp.module).toBe('./core/index.js');
    expect(imp.importedNames).toEqual(['AxiosError', 'AxiosHeaders']);
    expect(imp.line).toBe(1);
    expect(imp.raw).toBe(source);
  });

  it('handles namespace ES module import', async () => {
    const source = `import * as fetchAdapter from "./fetch.js";`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('es6');
    expect(imp.module).toBe('./fetch.js');
    expect(imp.importedNames).toEqual(['fetchAdapter']);
  });

  it('handles mixed default and named ES module import', async () => {
    const source = `import axios, { AxiosError } from "axios";`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('es6');
    expect(imp.module).toBe('axios');
    expect(imp.importedNames).toEqual(['axios', 'AxiosError']);
  });

  it('handles side effect only ES module import', async () => {
    const source = `import "./setup-env.js";`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('es6');
    expect(imp.module).toBe('./setup-env.js');
    expect(imp.importedNames).toEqual([]);
  });

  it('handles simple CommonJS require (bare)', async () => {
    const source = `require("axios");`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('commonjs');
    expect(imp.module).toBe('axios');
    expect(imp.importedNames).toEqual([]);
    expect(imp.line).toBe(1);
    expect(imp.raw.trim()).toBe('require("axios")'); // Call node excludes trailing semicolon
  });

  it('handles CommonJS require assigned to variable', async () => {
    const source = `const axios = require("axios");`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('commonjs');
    expect(imp.module).toBe('axios');
    expect(imp.importedNames).toEqual(['axios']);
  });

  it('handles CommonJS require with destructuring', async () => {
    const source = `const { readFile, writeFile } = require("fs");`;
    const imp = (await runExtract(source)).imports[0];
    expect(imp.kind).toBe('commonjs');
    expect(imp.module).toBe('fs');
    expect(imp.importedNames).toEqual(['readFile', 'writeFile']);
  });

  it('handles multiple imports with correct line numbers', async () => {
    const source = [
      `import axios from "axios";`,
      `import { AxiosError } from "./core/AxiosError.js";`,
      ``,
      `const fs = require("fs");`,
    ].join('\n');
    const imports = (await runExtract(source)).imports;
    expect(imports).toHaveLength(3);
    expect(imports[0].line).toBe(1);
    expect(imports[1].line).toBe(2);
    expect(imports[2].line).toBe(4);
    expect(imports[0].raw).toBe(`import axios from "axios";`);
    expect(imports[1].raw).toBe(`import { AxiosError } from "./core/AxiosError.js";`);
    expect(imports[2].raw).toBe(`const fs = require("fs");`);
  });

  it('handles file with no imports', async () => {
    const source = `console.log("no imports here");`;
    const imports = (await runExtract(source)).imports;
    expect(imports).toHaveLength(0);
  });
});
