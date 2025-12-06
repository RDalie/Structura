import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import fs from 'node:fs/promises';

const parser = new Parser();
parser.setLanguage(JavaScript as any);

export async function parseJSFile(filePath: string) {
  let code: string;

  try {
    code = await fs.readFile(filePath, 'utf8');
  } catch (err: any) {
    return {
      filePath,
      tree: null,
      hasErrors: true,
      errorType: 'FileReadError',
      errorMessage: err?.message ?? String(err),
    };
  }
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const hasErrors = root.hasError;

  return {
    filePath,
    tree,
    hasErrors,
    errorType: hasErrors ? 'SyntaxError' : null,
    errorMessage: hasErrors ? collectErrorSummary(root) : null,
  };
}

function collectErrorSummary(rootNode: any): string {
  const errors: string[] = [];

  const visit = (node: any) => {
    if (node.type === 'ERROR' || node.hasError) {
      errors.push(`Error at line ${node.startPosition.row + 1}`);
    }

    for (let i = 0; i < node.childCount; i++) {
      visit(node.child(i));
    }
  };

  visit(rootNode);

  return errors.join('; ');
}
