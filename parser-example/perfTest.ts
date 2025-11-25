import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import * as fs from "fs";
import { crawlJsFiles } from "../ingestion/crawler/index.js";
import { performance } from "perf_hooks";

async function testPerformance(root: string): Promise<void> {
  const parser = new Parser();
  parser.setLanguage(JavaScript as unknown as import("tree-sitter").Language);
  const files: string[] = await crawlJsFiles(root);
  console.log(`Found ${files.length} JS files\n`);

  let totalTime = 0;

  for (const file of files) {
    const code = await fs.promises.readFile(file, "utf8");

    const start = performance.now();
    parser.parse(code);
    const end = performance.now();

    const duration = end - start;
    totalTime += duration;

    const mem = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(`${file} | ${duration.toFixed(2)} ms | memory: ${mem.toFixed(2)} MB`);
  }

  console.log("\n=====================");
  console.log("Summary");
  console.log("=====================");
  console.log("Total files:", files.length);
  console.log("Average parse time:", (totalTime / files.length).toFixed(2), "ms");
}

testPerformance("/Users/rabyatayal/dev/axios");
