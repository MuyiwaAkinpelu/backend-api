import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FileNamingDTO {
    @ApiProperty({ description: 'The tag part of the filename (e.g. Research)' })
    @IsString()
    @IsNotEmpty()
    tag: string;

    @ApiProperty({ description: 'The date part of the filename (YYYYMMDD)' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{8}$/, { message: 'Date must be in YYYYMMDD format' })
    date: string;

    @ApiProperty({ description: 'The name part of the filename' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'The version part of the filename (e.g. v1, vF)' })
    @IsString()
    @IsNotEmpty()
    version: string;
}
