import { Inject, Injectable } from '@nestjs/common';
import { Driver } from 'neo4j-driver';

@Injectable()
export class GraphService {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  async runSampleQuery(): Promise<string> {
    const session = this.driver.session();

    try {
      const result = await session.run('RETURN "Hello Structura" AS message');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result.records[0].get('message');
    } finally {
      await session.close();
    }
  }
}
