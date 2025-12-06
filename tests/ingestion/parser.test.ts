import path from 'node:path';
import { parseJSFile } from '../../ingestion/parser/js/parseFile';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('parseJSFile', () => {
  it('parses a valid JS file without errors', async () => {
    const filePath = path.join(fixturesDir, 'valid.js');
    const result = await parseJSFile(filePath);

    expect(result.filePath).toBe(filePath);
    expect(result.tree).toBeTruthy();
    expect(result.hasErrors).toBe(false);
    expect(result.errorType).toBe(null);
    expect(result.errorMessage).toBe(null);
  });

  it('parses an invalid JS file and detects syntax errors', async () => {
    const filePath = path.join(fixturesDir, 'invalid.js');
    const result = await parseJSFile(filePath);

    expect(result.tree).toBeTruthy();
    expect(result.hasErrors).toBe(true);
    expect(result.errorType).toBe('SyntaxError');
    expect(result.errorMessage).not.toBeNull();
    expect(result.errorMessage).toContain('Error');
  });

  it('handles non existent files gracefully', async () => {
    const filePath = path.join(fixturesDir, 'no-such-file.js');
    const result = await parseJSFile(filePath);

    expect(result.tree).toBeNull();
    expect(result.hasErrors).toBe(true);
    expect(result.errorType).toBe('FileReadError');
    expect(result.errorMessage).toBeDefined();
  });
});
