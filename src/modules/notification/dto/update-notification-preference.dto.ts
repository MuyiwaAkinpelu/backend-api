import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  updates?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  approvals?: boolean;
}
