import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import fs from "node:fs/promises";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: ts-node parseOne.ts <file>");
    process.exit(1);
  }

  // 1. Read file
  const code = await fs.readFile(filePath, "utf8");

  // 2. Create parser and load JS grammar
  const parser = new Parser();
  parser.setLanguage(JavaScript as any);

  // 3. Parse code → AST
  const tree = parser.parse(code);

  // 4. Print root node (simple AST output)
  console.log(tree.rootNode.toString());
}

main();
