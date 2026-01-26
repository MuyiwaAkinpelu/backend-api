
import { PrismaClient } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { FileBaseEntity } from './src/modules/files/entities/file-base.entity';

const prisma = new PrismaClient();

async function main() {
    const file = await prisma.file.findFirst();
    if (!file) {
        console.log('No files found');
        return;
    }

    console.log('Raw File from DB:', JSON.stringify(file, null, 2));

    // Simulate @Serialize logic
    const instance = plainToInstance(FileBaseEntity, file, {
        excludeExtraneousValues: true,
    });

    console.log('Serialized File (FileBaseEntity):', JSON.stringify(instance, null, 2));
    console.log('File instance fields:', Object.keys(instance));
    console.log('FileType value:', (instance as any).fileType);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
