import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { GraphRepository } from './graph.repository';

@Module({
  imports: [PrismaModule],
  providers: [GraphRepository],
  exports: [GraphRepository],
})
export class GraphModule {}
