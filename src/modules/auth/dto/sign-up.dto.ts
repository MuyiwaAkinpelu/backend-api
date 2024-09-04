import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  ArrayUnique,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@modules/app/app.roles';

export class SignUpDto {
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

  @ApiProperty({ type: String, default: 'string!12345' })
  @IsString()
  @Length(6, 20)
  @Matches(/[\d\W]/, {
    message:
      'password must contain at least one digit and/or special character',
  })
  @Matches(/[a-zA-Z]/, { message: 'password must contain at least one letter' })
  @Matches(/^\S+$/, { message: 'password must not contain spaces' })
  readonly password!: string;

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
