import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  ArrayUnique,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@modules/app/app.roles';

export class UpdateUserDTO {
  @ApiProperty({ type: String })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsNotEmpty()
  readonly firstName!: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsNotEmpty()
  readonly lastName!: string;

  @ApiPropertyOptional({
    type: String,
    example: '+2348030300003',
    description: 'Phone number',
  })
  @IsPhoneNumber()
  @IsOptional()
  readonly phone: string;

  @ApiProperty({
    description: 'The roles of the user. Defaults to ["GUEST"].',
    enum: Roles,
    default: [Roles.GUEST],
  })
  @IsEnum(Roles, { each: true })
  @ArrayUnique()
  readonly roles!: Roles[];

  @ApiPropertyOptional({ type: String, example: 'Audit' })
  @IsString()
  @IsOptional()
  readonly department: string;

  @ApiPropertyOptional({ type: String, example: 'Principal' })
  @IsString()
  @IsOptional()
  readonly designation: string;
}
