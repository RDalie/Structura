export type FileImport = {
  filePath: string;
  imports: Array<{
    kind: 'es6' | 'commonjs';
    module: string;
    importedNames?: string[];
    line: number;
    raw: string;
  }>;
};
