import { Module } from '@nestjs/common';
import { GraphEdgesModule } from '../graph-edges/graph-edges.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { CallGraphExtractorService } from './call-graph-extractor.service';
import { ImportGraphExtractorService } from './import-graph-extractor.service';
import { IngestionPipelineService } from './ingestion-pipeline.service';
import { NormalizedModulesBuilderService } from './normalized-modules-builder.service';

@Module({
  imports: [PrismaModule, GraphEdgesModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionPipelineService,
    ImportGraphExtractorService,
    CallGraphExtractorService,
    NormalizedModulesBuilderService,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
