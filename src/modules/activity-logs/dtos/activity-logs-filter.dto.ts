import { ActivityEntity, ActivityVerb } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class ActivityLogsFiltersDTO {
  @IsOptional()
  @IsEnum(ActivityEntity)
  entity?: ActivityEntity;

  @IsOptional()
  @IsEnum(ActivityVerb)
  verb?: ActivityVerb;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  occurredAfter?: string;

  @IsOptional()
  @IsDateString()
  occurredBefore?: string;
}
