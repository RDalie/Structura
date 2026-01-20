import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Overview',
      items: ['intro'],
    },
    {
      type: 'category',
      label: 'AST System',
      items: [
        'ast-system/normalized-ast-schema',
        'ast-system/snapshot-and-ast-persistence-model',
        'ast-system/examples',
      ],
    },
    {
      type: 'category',
      label: 'Ingestion Pipeline',
      items: [
        'ingestion-pipeline/overview',
        'ingestion-pipeline/crawler',
        {
          type: 'category',
          label: 'Snapshots',
          items: [
            'ast-system/snapshot-and-ast-persistence-model',
            'ingestion-pipeline/snapshot-file-map',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Graph System',
      items: [
        {
          type: 'category',
          label: 'Extraction',
          items: [
            'graph-system/import-extractor',
            'graph-system/import-resolver',
            'graph-system/call-graph-extraction',
            'graph-system/member-access-extraction',
            'graph-system/assignment-graph-extraction',
            'graph-system/symbol-resolution',
          ],
        },
        {
          type: 'category',
          label: 'Dependency Graph',
          items: [
            'graph-system/dependency-graph-model',
            'graph-system/dependency-graph-normalizer',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Storage and Data Layout',
      items: [
        'storage-and-data-layout/cloud-storage-layout',
      ],
    },
    {
      type: 'category',
      label: 'Databases',
      items: ['databases/postgres-schema'],
    },
    {
      type: 'category',
      label: 'Learning',
      items: ['learning/snapshot-materializer'],
    },
  ],
};

export default sidebars;
