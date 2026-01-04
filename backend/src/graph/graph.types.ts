// Supported edge kinds within the Postgres-backed graph.
export enum EdgeKind {
  Call = 'Call',
  Import = 'Import',
  MemberAccess = 'MemberAccess',
  Assignment = 'Assignment',
  ResolvesTo = 'ResolvesTo',
  Declares = 'Declares',
}

// Handy list if you need to iterate or validate.
export const EDGE_KINDS: EdgeKind[] = [
  EdgeKind.Call,
  EdgeKind.Import,
  EdgeKind.MemberAccess,
  EdgeKind.Assignment,
  EdgeKind.ResolvesTo,
  EdgeKind.Declares,
];
