import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, HealthIndicatorResult } from '@nestjs/terminus';
import { Driver } from 'neo4j-driver';

@Injectable()
export class Neo4jHealthIndicator {
  constructor(
    @Inject('NEO4J_DRIVER') private readonly driver: Driver,
    private readonly healthIndicatorService: HealthIndicatorService
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const check = this.healthIndicatorService.check(key);
    const session = this.driver.session();

    try {
      await session.run('RETURN 1 as result');
      return check.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      return check.down(message);
    } finally {
      await session.close();
    }
  }
}
