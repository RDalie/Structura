import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';

type StartIngestionPayload = {
  path?: string;
};

type StartIngestionResponse = {
  snapshotId: string;
  message: string;
};

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  async start(@Body() body: StartIngestionPayload): Promise<StartIngestionResponse> {
    const path = body?.path?.trim();
    if (!path) {
      throw new BadRequestException('A repository path is required to start ingestion.');
    }

    return this.ingestionService.start(path);
  }

  @Get('snapshots')
  async listSnapshots() {
    return this.ingestionService.listSnapshots();
  }
}
