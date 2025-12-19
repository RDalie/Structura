import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';

@Module({
  providers: [
    {
      provide: 'NEO4J_DRIVER',
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Driver> => {
        const uri = config.get<string>('NEO4J_URI') ?? '';
        const user = config.get<string>('NEO4J_USER') ?? '';
        const password = config.get<string>('NEO4J_PASSWORD') ?? '';

        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

        await driver.verifyConnectivity();

        return driver;
      },
    },
    GraphService,
  ],
  controllers: [GraphController],
  exports: ['NEO4J_DRIVER', GraphService],
})
export class Neo4jGraphModule {}
