
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting fileType Backfill ---');

    const filesToUpdate = await prisma.file.findMany({
        where: {
            fileType: {
                isSet: false // Mongo specific: check if field exists or is null
            }
        },
        select: {
            id: true,
            filename: true,
            originalFilename: true
        }
    });

    // Fallback for some Prisma versions or if isSet doesn't hit nulls
    const filesWithNull = await prisma.file.findMany({
        where: {
            fileType: null
        },
        select: {
            id: true,
            filename: true,
            originalFilename: true
        }
    });

    const allFiles = [...filesToUpdate, ...filesWithNull];
    // Deduplicate by ID
    const uniqueFiles = Array.from(new Map(allFiles.map(f => [f.id, f])).values());

    console.log(`Found ${uniqueFiles.length} files to process.`);

    let updatedCount = 0;

    for (const file of uniqueFiles) {
        const nameToUse = file.filename || file.originalFilename;
        if (!nameToUse) continue;

        let extension = path.extname(nameToUse).replace('.', '').toLowerCase();

        // If extension is empty (e.g. filename has no dot), use a fallback or skip
        if (!extension) {
            console.log(`No extension found for file: ${file.id} (${nameToUse})`);
            continue;
        }

        // Special handling for common typos or data issues if needed
        // e.g. mapping 'jpeg' to 'jpg' if desired, but we'll stick to raw extension

        await prisma.file.update({
            where: { id: file.id },
            data: { fileType: extension }
        });

        updatedCount++;
        if (updatedCount % 50 === 0) {
            console.log(`Updated ${updatedCount}/${uniqueFiles.length} files...`);
        }
    }

    console.log(`--- Backfill Complete! Updated ${updatedCount} files. ---`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
