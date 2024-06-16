import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Roles } from '@modules/app/app.roles';

export class UpdateUserRolesDTO {
  @ApiProperty({
    description: 'Roles to assign to the user',
    example: [
      Roles.GUEST,
      Roles.NEW_STAFF,
      Roles.PROGRAM_OPERATION_STAFF,
      Roles.MANAGEMENT_STAFF,
      Roles.SYSTEM_ADMIN,
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Roles, { each: true })
  roles: Roles[];
}
