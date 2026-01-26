import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

/**
 * BACKFILL SCRIPT: Sync Project Manager Relations
 * 
 * This script addresses the issue where managers were previously stored 
 * in the 'projectMemberProjectIDs' field due to a schema bug.
 * 
 * Logic:
 * 1. Iterate through all Projects.
 * 2. For each project, identify the IDs in 'managersIDs'.
 * 3. Ensure those Project IDs are present in the 'projectManagerProjectIDs' 
 *    field of the corresponding User documents.
 */
async function backfill() {
    const logger = new Logger('BackfillScript');
    const prisma = new PrismaClient();

    logger.log('Starting project-manager relation backfill...');

    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                managersIDs: true,
            }
        });

        logger.log(`Found ${projects.length} projects to process.`);

        let updateCount = 0;

        for (const project of projects) {
            if (!project.managersIDs || project.managersIDs.length === 0) continue;

            for (const managerId of project.managersIDs) {
                // Use push logic to ensure the ID is in the field without overwriting others
                // MongoDB '$addToSet' equivalent in Prisma ensures no duplicates
                await prisma.user.update({
                    where: { id: managerId },
                    data: {
                        projectManagerProjectIDs: {
                            push: project.id
                        }
                    }
                });
                updateCount++;
            }
        }

        // Optional: Clean up duplicates if necessary (Prisma 'push' doesn't uniquely check by default in some versions)
        logger.log('Relation sync complete. Performing duplicate cleanup...');

        const users = await prisma.user.findMany({
            where: { projectManagerProjectIDs: { isEmpty: false } },
            select: { id: true, projectManagerProjectIDs: true }
        });

        for (const user of users) {
            const uniqueIds = Array.from(new Set(user.projectManagerProjectIDs));
            if (uniqueIds.length !== user.projectManagerProjectIDs.length) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { projectManagerProjectIDs: { set: uniqueIds } }
                });
            }
        }

        logger.log(`Backfill finished successfully. Processed ${updateCount} manager assignments.`);

    } catch (error) {
        logger.error('Backfill failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

backfill();


// to run
// npx ts-node -r tsconfig-paths/register scripts/backfill-project-relations.ts
// 1. Copy the script from your computer into the running container
// docker cp scripts/backfill-project-relations.ts drs-api:/app/scripts/backfill-project-relations.ts
// 2. Run the script inside the container
// docker exec -it drs-api npx ts-node -r tsconfig-paths/register scripts/backfill-project-relations.ts