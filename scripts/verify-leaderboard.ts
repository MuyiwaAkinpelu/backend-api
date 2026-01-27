import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- Database Verification: Leaderboard ---');

        // 1. Get Top Uploaders raw from File table
        const topUploaders = await prisma.file.groupBy({
            by: ['uploaderId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });

        for (const entry of topUploaders) {
            const user = await prisma.user.findUnique({
                where: { id: entry.uploaderId || '' },
                select: { firstName: true, lastName: true, email: true }
            });

            console.log(`User: ${user?.firstName} ${user?.lastName} (${user?.email})`);
            console.log(`Reported Uploads: ${entry._count.id}`);

            // Verify by individual count
            const verifyCount = await prisma.file.count({
                where: { uploaderId: entry.uploaderId }
            });
            console.log(`Verified Count: ${verifyCount}`);

            // Get Dates analysis
            const earliest = await prisma.file.findFirst({ where: { uploaderId: entry.uploaderId }, orderBy: { uploadDate: 'asc' }, select: { uploadDate: true } });
            const latest = await prisma.file.findFirst({ where: { uploaderId: entry.uploaderId }, orderBy: { uploadDate: 'desc' }, select: { uploadDate: true } });
            console.log(`Usage Range: ${earliest?.uploadDate.toISOString().split('T')[0]} to ${latest?.uploadDate.toISOString().split('T')[0]}`);

            // Get Samples
            const samples = await prisma.file.findMany({
                where: { uploaderId: entry.uploaderId },
                take: 5,
                select: { originalFilename: true, uploadDate: true }
            });
            console.log('Samples:', samples.map(s => `"${s.originalFilename}" (${s.uploadDate.toISOString().split('T')[0]})`).join(', '));
            console.log('---');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
