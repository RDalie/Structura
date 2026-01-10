import { Injectable, Logger } from '@nestjs/common';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { crawlJsFiles } from '@structura/ingestion';
import type { Snapshot } from '../../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CallGraphExtractorService } from './call-graph-extractor.service';
import { ImportGraphExtractorService } from './import-graph-extractor.service';
import { MemberAccessExtractorService } from './member-access-extractor.service';
import { AssignmentGraphExtractorService } from './assignment-graph-extractor.service';
import { NormalizedModulesBuilderService } from './normalized-modules-builder.service';
import { parseAndPersist } from './parse-and-persist';
import { SymbolGraphExtractor } from './symbol-graph-extractor';

@Injectable()
export class IngestionPipelineService {
  private readonly logger = new Logger(IngestionPipelineService.name);
  private readonly parser: Parser;

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizedModulesBuilder: NormalizedModulesBuilderService,
    private readonly assignmentGraphExtractor: AssignmentGraphExtractorService,
    private readonly importGraphExtractor: ImportGraphExtractorService,
    private readonly callGraphExtractor: CallGraphExtractorService,
    private readonly memberAccessExtractor: MemberAccessExtractorService,
    private readonly symbolGraphExtractor: SymbolGraphExtractor
  ) {
    this.parser = new Parser();
    // tree-sitter typings do not carry the language type information here.
    this.parser.setLanguage(JavaScript as unknown as Parser.Language);
  }

  // crawls JS/TS files, parses + persists normalized ASTs, then extracts graph edges
  async run(root: string, snapshot: Snapshot) {
    const snapshotId = snapshot.id;
    try {
      const files = await crawlJsFiles(root);
      this.logger.log(
        `Snapshot ${snapshotId}: discovered ${files.length} JS/TS files under ${root}`
      );

      const outcome = await parseAndPersist({
        files,
        parser: this.parser,
        snapshot,
        prisma: this.prisma,
        logger: this.logger,
      });

      this.logger.log(
        `Snapshot ${snapshotId}: parsed ${outcome.parsed}/${outcome.total} files, normalized ${outcome.normalized}, failures: ${outcome.failed}`
      );

      const context = await this.normalizedModulesBuilder.build(snapshot, files, this.parser);
      if (!context) {
        return;
      }

      await this.assignmentGraphExtractor.extract(context);
      await this.importGraphExtractor.extract(context);
      await this.callGraphExtractor.extract(context);
      await this.memberAccessExtractor.extract(context);
      await this.symbolGraphExtractor.extract(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Snapshot ${snapshotId}: ingestion pipeline failed for ${root}: ${message}`
      );
    }
  }
}
