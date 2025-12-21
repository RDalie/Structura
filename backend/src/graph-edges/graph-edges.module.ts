import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { GraphEdgesService } from './graph-edges.service';
import { GraphEdgesController } from './graph-edges.controller';

@Module({
  imports: [GraphModule, PrismaModule],
  controllers: [GraphEdgesController],
  providers: [GraphEdgesService],
  exports: [GraphEdgesService],
})
export class GraphEdgesModule {}
