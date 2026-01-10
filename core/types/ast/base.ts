import type { ModuleNode, ImportNode } from './module';
import type { FunctionNode, ParameterNode, VariableNode } from './declarations';
import type {
  BlockNode,
  ReturnNode,
  ExpressionStatementNode,
  ConditionalNode,
  LoopNode,
} from './statements';
import type {
  CallNode,
  BinaryOpNode,
  UnaryOpNode,
  AssignmentNode,
  MemberExpressionNode,
} from './expressions';

export interface BaseNode {
  id: string;
  type: string;
  filePath: string;
  data?: Record<string, unknown>;
  location?: {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
  };
  originalType?: string;
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: string | number | boolean | null;
  literalType: 'string' | 'number' | 'boolean' | 'null';
}

export interface UnknownNode extends BaseNode {
  type: 'Unknown';
  raw: string;
}

export type NormalizedNode =
  | ModuleNode
  | IdentifierNode
  | LiteralNode
  | VariableNode
  | FunctionNode
  | ParameterNode
  | BlockNode
  | ConditionalNode
  | LoopNode
  | BinaryOpNode
  | UnaryOpNode
  | AssignmentNode
  | CallNode
  | MemberExpressionNode
  | ReturnNode
  | ExpressionStatementNode
  | ImportNode
  | UnknownNode;
