import { BaseNode } from './base';
import type { NormalizedNode } from './base';

export interface BlockNode extends BaseNode {
  type: 'Block';
  statements: NormalizedNode[];
}

export interface ReturnNode extends BaseNode {
  type: 'Return';
  value?: NormalizedNode;
}

export interface ExpressionStatementNode extends BaseNode {
  type: 'ExpressionStatement';
  expression: NormalizedNode;
}

export interface ConditionalNode extends BaseNode {
  type: 'Conditional';
  condition: NormalizedNode;
  then: BlockNode;
  else?: BlockNode;
}

export interface LoopNode extends BaseNode {
  type: 'Loop';
  loopType: 'for' | 'while' | 'do-while' | 'for-of' | 'for-in';
  init?: NormalizedNode;
  condition?: NormalizedNode;
  update?: NormalizedNode;
  body: BlockNode;
}
