import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOTPDto {
    @ApiProperty({ description: 'The email address of the user' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
