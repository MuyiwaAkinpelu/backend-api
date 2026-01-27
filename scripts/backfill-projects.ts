import { PrismaClient, Status } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- Database Migration: Backfilling Project Status ---');

        // 1. Update all projects result
        const result = await prisma.project.updateMany({
            data: {
                status: Status.ACTIVE
            },
        });

        console.log(`Successfully backfilled ${result.count} projects to ACTIVE status.`);

    } catch (error) {
        console.error('Backfill failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
