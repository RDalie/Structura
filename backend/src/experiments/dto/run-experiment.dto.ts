import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class RunExperimentDto {
  @IsUUID()
  snapshotId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  numLayers?: number = 2;

  @IsOptional()
  @IsInt()
  @Min(32)
  @Max(512)
  hiddenChannels?: number = 128;

  @IsOptional()
  @IsInt()
  @Min(1)
  seed?: number = 42;
}
