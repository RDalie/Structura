import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { Neo4jHealthIndicator } from './neo4j.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaIndicator: PrismaHealthIndicator,
    private mongooseIndicator: MongooseHealthIndicator,
    private prismaService: PrismaService,
    private neo4jIndicator: Neo4jHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('postgres', this.prismaService),
      () => this.mongooseIndicator.pingCheck('mongodb'),
      () => this.neo4jIndicator.pingCheck('neo4j'),
    ]);
  }
}
