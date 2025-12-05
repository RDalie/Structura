import { Controller, Get } from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('test')
  async testConnection(): Promise<string> {
    return this.graphService.runSampleQuery();
  }
}
