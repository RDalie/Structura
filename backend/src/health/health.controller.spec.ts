import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MongooseHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { Neo4jHealthIndicator } from './neo4j.health';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const healthCheckServiceMock = { check: jest.fn() };
    const prismaIndicatorMock = { pingCheck: jest.fn() };
    const mongooseIndicatorMock = { pingCheck: jest.fn() };
    const neo4jIndicatorMock = { pingCheck: jest.fn() };
    const prismaServiceMock = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckServiceMock },
        { provide: PrismaHealthIndicator, useValue: prismaIndicatorMock },
        { provide: MongooseHealthIndicator, useValue: mongooseIndicatorMock },
        { provide: Neo4jHealthIndicator, useValue: neo4jIndicatorMock },
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
