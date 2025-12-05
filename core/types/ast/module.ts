import { BaseNode } from './base';
import type { NormalizedNode } from './base';

export interface ModuleNode extends BaseNode {
  type: 'Module';
  path: string;
  body: NormalizedNode[];
}

export interface ImportNode extends BaseNode {
  type: 'Import';
  module: string;
  imported: string[];
}
