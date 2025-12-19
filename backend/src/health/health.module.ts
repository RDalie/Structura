import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MongoModule } from '../infrastructure/mongodb/mongo.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { Neo4jGraphModule } from '../infrastructure/neo4j/graph.module';
import { HealthController } from './health.controller';
import { Neo4jHealthIndicator } from './neo4j.health';

@Module({
  imports: [TerminusModule, PrismaModule, MongoModule, Neo4jGraphModule],
  controllers: [HealthController],
  providers: [Neo4jHealthIndicator],
})
export class HealthModule {}
