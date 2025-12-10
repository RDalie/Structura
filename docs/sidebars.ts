import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

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
      items: [
        'overview/what-is-structura',
        'overview/key-concepts-and-architecture',
        'overview/system-components',
        'overview/glossary',
      ],
    },
    {
      type: 'category',
      label: 'Ingestion Pipeline',
      items: [
        'ingestion-pipeline/overview',
        'ingestion-pipeline/source-types',
        'ingestion-pipeline/crawler',
        'ingestion-pipeline/parser',
        'ingestion-pipeline/snapshot-creation',
        'ingestion-pipeline/snapshot-file-map',
        'ingestion-pipeline/error-handling',
      ],
    },
    {
      type: 'category',
      label: 'Storage and Data Layout',
      items: [
        'storage-and-data-layout/cloud-storage-layout',
        'storage-and-data-layout/snapshot-model',
        'storage-and-data-layout/versioning-strategy',
        'storage-and-data-layout/path-helpers-and-conventions',
        'storage-and-data-layout/metadata-files',
      ],
    },
    {
      type: 'category',
      label: 'AST System',
      items: [
        'ast-system/ast-extraction-pipeline',
        'ast-system/normalization-overview',
        'ast-system/normalized-ast-schema',
        'ast-system/examples',
      ],
    },
    {
      type: 'category',
      label: 'Graph System',
      items: [
        {
          type: 'category',
          label: 'Dependency Graph',
          items: [
            'graph-system/dependency-graph-model',
            'graph-system/import-extractor',
            'graph-system/import-resolver',
          ],
        },
        {
          type: 'category',
          label: 'Call Graph',
          items: [
            'graph-system/call-graph-model',
          ],
        },
        {
          type: 'category',
          label: 'Storage & Querying',
          items: [
            'graph-system/graph-storage-format',
            'graph-system/querying-graph-data',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Databases',
      items: [
        'databases/postgres-schema',
        'databases/mongodb-usage',
        'databases/neo4j-usage',
        'databases/data-flow-between-databases',
      ],
    },
    {
      type: 'category',
      label: 'Analysis and Insights',
      items: [
        'analysis-and-insights/metrics-and-heuristics',
        'analysis-and-insights/code-smells-and-risk-indicators',
        'analysis-and-insights/comprehension-support-features',
        'analysis-and-insights/future-analysis-roadmap',
      ],
    },
    {
      type: 'category',
      label: 'Backend Architecture',
      items: [
        'backend-architecture/module-structure',
        'backend-architecture/infrastructure-modules',
        'backend-architecture/configuration',
        'backend-architecture/error-handling-strategy',
        'backend-architecture/logging-strategy',
      ],
    },
    {
      type: 'category',
      label: 'Frontend Architecture',
      items: [
        'frontend-architecture/ui-principles',
        'frontend-architecture/components-overview',
        'frontend-architecture/code-viewer',
        'frontend-architecture/graph-visualizer',
        'frontend-architecture/dashboard',
      ],
    },
    {
      type: 'category',
      label: 'Extending Structura',
      items: [
        'extending-structura/adding-new-languages',
        'extending-structura/adding-new-metrics',
        'extending-structura/adding-new-storage-backends',
        'extending-structura/adding-new-graph-types',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/rest-endpoints',
        'api-reference/types-and-dtos',
        'api-reference/ingestion-api',
        'api-reference/graph-query-api',
      ],
    },
    {
      type: 'category',
      label: 'Development Guide',
      items: [
        'development-guide/local-setup',
        'development-guide/running-pipelines',
        'development-guide/testing-and-debugging',
        'development-guide/coding-standards',
        'development-guide/contributing-guide',
      ],
    },
    {
      type: 'category',
      label: 'Research and Theory',
      items: [
        'research-and-theory/developer-comprehension-model',
        'research-and-theory/related-research',
        'research-and-theory/how-structura-supports-comprehension',
        'research-and-theory/vision-for-future-research',
      ],
    },
  ],
};

export default sidebars;
