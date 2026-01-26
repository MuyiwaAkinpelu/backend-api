import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class ProjectDocumentStatRepository {
    constructor(private readonly prisma: PrismaService) { }

    findAll() {
        return this.prisma.projectDocumentStat.findMany({
            include: { project: true },
        });
    }
}
