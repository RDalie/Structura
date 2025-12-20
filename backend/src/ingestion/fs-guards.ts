import { BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs/promises';

// Ensure the provided path exists and is a directory we can read before ingestion begins.
export async function assertDirectoryReadable(root: string) {
  const stats = await fs.stat(root).catch(() => {
    throw new BadRequestException(`Path ${root} does not exist or is not readable.`);
  });

  if (!stats.isDirectory()) {
    throw new BadRequestException(`Path ${root} is not a directory.`);
  }
}
