import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import ProjectEntity from './project.entity';
import { ProjectCategory } from '@prisma/client';

@Exclude()
export default class ProjectBaseEntity extends PartialType(ProjectEntity) {
  @ApiProperty({ type: String })
  @Expose()
  readonly id: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly name: string | null;

  @ApiProperty({ enum: ProjectCategory, nullable: true })
  @Expose()
  readonly category: ProjectCategory | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  readonly description: string | null;

  @ApiProperty({ type: Array, nullable: true })
  @Expose()
  readonly projectManagers: string[] | null;

  @ApiProperty({ type: Array, nullable: true })
  @Expose()
  readonly projectMembers: string[] | null;

  @ApiProperty({ type: Date, nullable: true })
  @Expose()
  readonly createdAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  @Expose()
  readonly updatedAt: Date | null;
}
