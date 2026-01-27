
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
    const fileCount = await prisma.file.count();
    const projectCount = await prisma.project.count();
    const approvalCount = await prisma.approvalRequest.count();

    console.log('File count:', fileCount);
    console.log('Project count:', projectCount);
    console.log('ApprovalRequest count:', approvalCount);

    await prisma.$disconnect();
}

checkCounts();
