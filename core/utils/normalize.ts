import { SNAPSHOT_VERSION } from '../config/snapshotVersion';
import {
  normalizeAssignment,
  normalizeIdentifier,
  normalizeLiteral,
  normalizeCall,
  normalizeMemberExpression,
} from './normalizers/expressions';
import { normalizeFunction } from './normalizers/functions';
import { normalizeImport } from './normalizers/imports';
import { normalizeProgram } from './normalizers/program';
import {
  normalizeConditional,
  normalizeExpressionStatement,
  normalizeLoop,
  normalizeReturn,
  normalizeVariableDeclaration,
} from './normalizers/statements';
import { normalizeUnknown } from './normalizers/unknown';
import type { NormalizeFn } from './normalizers/common';

export const normalize: NormalizeFn = (
  node,
  source,
  filePath = '',
  snapshotVersion = SNAPSHOT_VERSION
) => {
  switch (node.type) {
    case 'program':
      return normalizeProgram(node, source, filePath, snapshotVersion, normalize);
    case 'parenthesized_expression':
      return normalize(node.namedChildren[0] ?? node, source, filePath, snapshotVersion);
    case 'identifier':
      return normalizeIdentifier(node, source, filePath, snapshotVersion);
    case 'number':
    case 'string':
    case 'true':
    case 'false':
    case 'null':
      return normalizeLiteral(node, source, filePath, snapshotVersion);
    case 'call_expression':
      return normalizeCall(node, source, filePath, snapshotVersion, normalize);
    case 'member_expression':
    case 'optional_member_expression':
    case 'optional_chain':
      return normalizeMemberExpression(node, source, filePath, snapshotVersion, normalize);
    case 'function_declaration':
    case 'function':
    case 'arrow_function':
      return normalizeFunction(node, source, filePath, snapshotVersion, normalize);
    case 'if_statement':
      return normalizeConditional(node, source, filePath, snapshotVersion, normalize);
    case 'for_statement':
    case 'while_statement':
    case 'do_statement':
    case 'for_in_statement':
    case 'for_of_statement':
      return normalizeLoop(node, source, filePath, snapshotVersion, normalize);
    case 'return_statement':
      return normalizeReturn(node, source, filePath, snapshotVersion, normalize);
    case 'expression_statement':
      return normalizeExpressionStatement(node, source, filePath, snapshotVersion, normalize);
    case 'lexical_declaration':
      return normalizeVariableDeclaration(node, source, filePath, snapshotVersion, normalize);
    case 'import_statement':
      return normalizeImport(node, source, filePath, snapshotVersion);
    case 'assignment_expression':
    case 'augmented_assignment_expression':
      return normalizeAssignment(node, source, filePath, snapshotVersion, normalize);
    default:
      return normalizeUnknown(node, source, filePath, snapshotVersion);
  }
};
