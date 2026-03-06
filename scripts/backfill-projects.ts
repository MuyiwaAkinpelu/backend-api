import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('Starting backfill for projects...');

        const projects = await prisma.project.findMany();

        for (const project of projects) {
            console.log(`Backfilling project: ${project.name}`);

            await prisma.project.update({
                where: { id: project.id },
                data: {
                    // Setting establishedDate to createdAt as requested
                    establishedDate: project.createdAt,
                    // Leaving bodyOfWork as null so they can edit it manually as requested (implied by "so they can edit and update it")
                },
            });
        }

        console.log('Backfill completed successfully.');
    } catch (error) {
        console.error('Error during backfill:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
