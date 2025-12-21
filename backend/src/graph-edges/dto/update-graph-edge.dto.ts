import { PartialType } from '@nestjs/mapped-types';
import { CreateGraphEdgeDto } from './create-graph-edge.dto';

export class UpdateGraphEdgeDto extends PartialType(CreateGraphEdgeDto) {}
