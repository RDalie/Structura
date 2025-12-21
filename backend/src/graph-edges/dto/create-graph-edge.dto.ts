// DTO for creating a graph edge. The `id` can be omitted; it will be generated server-side.
export class CreateGraphEdgeDto {
  id?: string;
  fromId!: string;
  toId!: string;
  kind!: string;
  filePath!: string;
  snapshotId!: string;
  version?: number;
}
