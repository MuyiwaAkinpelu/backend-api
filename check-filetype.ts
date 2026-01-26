
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking File records for fileType ---');

    const sampleFiles = await prisma.file.findMany({
        take: 10,
        select: {
            id: true,
            originalFilename: true,
            fileType: true,
            contentType: true
        }
    });

    console.log('Sample Files:', JSON.stringify(sampleFiles, null, 2));

    const nullCount = await prisma.file.count({
        where: {
            fileType: null
        }
    });

    const totalCount = await prisma.file.count();

    console.log(`Total Files: ${totalCount}`);
    console.log(`Files with null fileType: ${nullCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
