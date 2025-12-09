import { BaseNode } from './base';
import type { NormalizedNode, IdentifierNode, LiteralNode } from './base';

export interface CallNode extends BaseNode {
  type: 'Call';
  callee: NormalizedNode;
  args: NormalizedNode[];
  raw?: string;
}

export interface BinaryOpNode extends BaseNode {
  type: 'BinaryOp';
  operator: string;
  left: NormalizedNode;
  right: NormalizedNode;
}

export interface UnaryOpNode extends BaseNode {
  type: 'UnaryOp';
  operator: string;
  arg: NormalizedNode;
}

export interface MemberAccessNode extends BaseNode {
  type: 'MemberAccess';
  object: NormalizedNode;
  property: IdentifierNode | LiteralNode;
}
