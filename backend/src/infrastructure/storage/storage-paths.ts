// Centralized path generator for Structura cloud storage layout

export const StoragePaths = {
  projectPrefix(projectId: string) {
    return `projects/${projectId}/v1/`;
  },

  snapshotPrefix(projectId: string, snapshotId: string) {
    return `projects/${projectId}/v1/snapshots/${snapshotId}/`;
  },

  // SOURCE
  source: {
    uploads(projectId: string, snapshotId: string) {
      return `projects/${projectId}/v1/snapshots/${snapshotId}/source/uploads/`;
    },
    extracted(projectId: string, snapshotId: string) {
      return `projects/${projectId}/v1/snapshots/${snapshotId}/source/extracted/`;
    },
    git(projectId: string, snapshotId: string) {
      return `projects/${projectId}/v1/snapshots/${snapshotId}/source/git/`;
    },
  },

  // ASTS
  ast(projectId: string, snapshotId: string, hash: string) {
    return `projects/${projectId}/v1/snapshots/${snapshotId}/asts/${hash}.json`;
  },

  // GRAPHS
  graph(projectId: string, snapshotId: string, hash: string) {
    return `projects/${projectId}/v1/snapshots/${snapshotId}/graphs/${hash}.json`;
  },

  // METADATA
  metadata: {
    folder(projectId: string, snapshotId: string) {
      return `projects/${projectId}/v1/snapshots/${snapshotId}/metadata/`;
    },
    project(projectId: string) {
      return `projects/${projectId}/v1/metadata/project.json`;
    },
    filesMap(projectId: string, snapshotId: string) {
      return `projects/${projectId}/v1/snapshots/${snapshotId}/metadata/files.json`;
    },
    ingestion(projectId: string, snapshotId: string) {
      return `projects/${projectId}/v1/snapshots/${snapshotId}/metadata/ingestion.json`;
    },
  },
};
