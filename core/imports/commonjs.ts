import type {
  CallNode,
  IdentifierNode,
  LiteralNode,
  NormalizedNode,
  VariableNode,
} from '../types/ast';
import type { FileImport } from './types';
import { extractRaw } from './raw';

type AddImport = (record: FileImport['imports'][number]) => void;

function isRequireCall(node: CallNode): { module: string } | null {
  const callee = node.callee as NormalizedNode;
  const firstArg = node.args[0] as NormalizedNode | undefined;
  const isRequireIdentifier =
    callee.type === 'Identifier' && (callee as IdentifierNode).name === 'require';
  const isStringLiteral =
    firstArg?.type === 'Literal' &&
    (firstArg as LiteralNode).literalType === 'string' &&
    typeof (firstArg as LiteralNode).value === 'string';
  if (!isRequireIdentifier || !isStringLiteral) return null;
  return { module: (firstArg as LiteralNode).value as string };
}

export function handleRequireCall(node: CallNode, source: string, addImport: AddImport): boolean {
  const req = isRequireCall(node);
  if (!req) return false;

  addImport({
    kind: 'commonjs',
    module: req.module,
    importedNames: [],
    line: (node.location?.startLine ?? 0) + 1,
    raw: extractRaw(source, node),
  });
  return true;
}

export function handleRequireVariable(
  node: VariableNode,
  source: string,
  addImport: AddImport
): boolean {
  const init = node.initializer as NormalizedNode | undefined;
  if (!init || init.type !== 'Call') return false;
  const req = isRequireCall(init as CallNode);
  if (!req) return false;

  const name = node.name;
  const destructuredNames =
    name && name.startsWith('{') && name.includes('}')
      ? name
          .slice(name.indexOf('{') + 1, name.lastIndexOf('}'))
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .map((n) => (n.includes(':') ? n.split(':')[1].trim() : n))
      : name
        ? [name]
        : [];

  const lineText =
    source.split(/\r?\n/)[node.location?.startLine ?? 0] ?? extractRaw(source, node);
  const raw = lineText.trim();

  addImport({
    kind: 'commonjs',
    module: req.module,
    importedNames: destructuredNames,
    line: (node.location?.startLine ?? 0) + 1,
    raw,
  });
  return true;
}
