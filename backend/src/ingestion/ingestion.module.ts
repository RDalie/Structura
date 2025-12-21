import { Module } from '@nestjs/common';
import { GraphEdgesModule } from '../graph-edges/graph-edges.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [PrismaModule, GraphEdgesModule],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
