export type CallRecord = {
  // Identifier or expression text of the callee; format to be finalized when implemented.
  callee: string;
  line: number;
  raw: string;
};

export type FileCalls = {
  filePath: string;
  calls: CallRecord[];
};
