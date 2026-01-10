import { BaseNode } from './base';
import type { NormalizedNode, IdentifierNode } from './base';

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

export interface AssignmentNode extends BaseNode {
  type: 'Assignment';
  left: NormalizedNode;
  right: NormalizedNode;
}

export interface MemberExpressionNode extends BaseNode {
  type: 'MemberExpression';
  object: NormalizedNode;
  property: IdentifierNode;
}
