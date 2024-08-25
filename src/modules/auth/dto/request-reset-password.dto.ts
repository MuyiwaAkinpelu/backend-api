import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetPasswordDto {
  @ApiProperty({ type: String, example: 'alhajee2009@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;
}
