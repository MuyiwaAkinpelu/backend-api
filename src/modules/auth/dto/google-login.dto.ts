import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
    @ApiProperty({ description: 'The Google ID token obtained from the frontend' })
    @IsString()
    @IsNotEmpty()
    readonly idToken!: string;
}
