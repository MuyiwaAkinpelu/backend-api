
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGroupBy() {
    try {
        const stats = await prisma.approvalRequest.groupBy({
            by: ['projectId'],
            _count: { documentId: true }
        });
        console.log('GroupBy projectId successful, results:', stats.length);

        const scidarDocs = await prisma.approvalRequest.groupBy({
            by: ['documentId'],
            where: { project: { category: 'SCIDAR' as any } }
        });
        console.log('GroupBy documentId successful, results:', scidarDocs.length);
    } catch (err: any) {
        console.error('Test failed:', err.message || err);
    } finally {
        await prisma.$disconnect();
    }
}

testGroupBy();
