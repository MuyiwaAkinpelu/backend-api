import { PrismaClient, ActivityVerb } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- Database Verification: Historical Activity ---');

        const viewCount = await prisma.activityLog.count({
            where: { verb: ActivityVerb.VIEW }
        });

        const downloadCount = await prisma.activityLog.count({
            where: { verb: ActivityVerb.DOWNLOAD }
        });

        console.log(`Total Activity Logs with Verb 'VIEW': ${viewCount}`);
        console.log(`Total Activity Logs with Verb 'DOWNLOAD': ${downloadCount}`);

        // If counts exist, show samples to see if they link to files
        if (viewCount > 0) {
            const samples = await prisma.activityLog.findMany({
                where: { verb: ActivityVerb.VIEW },
                take: 3,
                select: { entity: true, entityId: true, createdAt: true }
            });
            console.log('View Samples:', JSON.stringify(samples, null, 2));
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
