import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/modules/app/app.module';
import { PrismaService } from '../src/providers/prisma/prisma.service';
import { UploadService } from '../src/modules/files/upload.service';
import { Logger } from '@nestjs/common';
import { extractDescription } from '../src/common/utils';

process.env.IS_SEEDING = 'true';

async function backfill() {
    const logger = new Logger('Backfill-Descriptions');
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const uploadService = app.get(UploadService);

    logger.log('Fetching all files...');
    const files = await prisma.file.findMany();
    logger.log(`Found ${files.length} files to process.`);

    for (const file of files) {
        try {
            if (!file.filename || !file.contentType) {
                logger.warn(`Skipping file ${file.id}: missing filename or contentType`);
                continue;
            }

            logger.log(`Processing file: ${file.originalFilename} (${file.id})`);
            const content = await uploadService.extractTextFromFile(
                file.filename,
                file.contentType,
            );

            if (!content) {
                logger.warn(`No content extracted for file: ${file.id}`);
                continue;
            }

            const description = extractDescription(content);

            await prisma.file.update({
                where: { id: file.id },
                data: { description },
            });
            logger.log(`Updated description for file: ${file.id}`);
        } catch (error: any) {
            logger.error(`Error processing file ${file.id}: ${error.message}`);
        }
    }

    logger.log('Backfill complete!');
    await app.close();
}

backfill()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
