import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- Database Migration: Initializing Document Metrics ---');

        // We update all documents. Those already having 0 will stay 0.
        // This ensures every single document has these fields initialized.
        const result = await prisma.file.updateMany({
            data: {
                views: 0,
                downloads: 0
            },
        });

        console.log(`Successfully initialized metrics (views/downloads) for ${result.count} documents.`);

    } catch (error) {
        console.error('Initialization failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
