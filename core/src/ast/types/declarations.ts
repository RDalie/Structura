import { BaseNode } from './base';
import type { NormalizedNode } from './base';
import type { BlockNode } from './statements';

export interface FunctionNode extends BaseNode {
  type: 'Function';
  name?: string;
  params: ParameterNode[];
  returnType?: string;
  body: BlockNode;
}

export interface ParameterNode extends BaseNode {
  type: 'Parameter';
  name: string;
  paramType?: string;
}

export interface VariableNode extends BaseNode {
  type: 'Variable';
  name: string;
  kind: 'let' | 'const' | 'var';
  initializer?: NormalizedNode;
}
