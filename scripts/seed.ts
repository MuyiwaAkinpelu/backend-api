
process.env.IS_SEEDING = 'true';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/modules/app/app.module';
import { PrismaService } from '../src/providers/prisma/prisma.service'; // Path adjustments might be needed depending on execution context
import { SearchService } from '../src/modules/search/search.service';
import { faker } from '@faker-js/faker';
import { Roles, ProjectCategory, Status, DocumentVisibility, ApprovalStatus, ActivityVerb, ActivityEntity, ActivityOutcome, SecurityEventType } from '@prisma/client';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('Seeder');
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const searchService = app.get(SearchService);

    logger.log('Cleaning database...');
    // Delete in order to avoid FK constraints
    await prisma.activityLog.deleteMany();
    await prisma.securityEventStat.deleteMany();
    await prisma.dailyUploadStat.deleteMany();
    await prisma.userActivityDaily.deleteMany();
    await prisma.approvalRequest.deleteMany();
    await prisma.projectDocumentStat.deleteMany();
    // await prisma.file.deleteMany(); // Files might be linked to projects/users
    // We need to delete files carefully or cascade. 
    // Let's rely on cascade delete if possible or delete specific entities.
    await prisma.file.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    logger.log('Database cleaned. Starting seed...');

    const users = [];
    const projects = [];
    const files = [];

    // --- Users ---
    // System Admin (1)
    const admin = await prisma.user.create({
        data: {
            email: 'admin@scidar.com',
            password: 'password123', // In real app, hash this
            firstName: 'System',
            lastName: 'Admin',
            roles: [Roles.SYSTEM_ADMIN],
            isActive: true,
            isVerified: true,
        }
    });
    users.push(admin);



    // Management Staff (3)
    for (let i = 0; i < 3; i++) {
        const u = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                password: 'password123',
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                roles: [Roles.MANAGEMENT_STAFF],
                isActive: true,
                isVerified: true,
                department: 'Management'
            }
        });
        users.push(u);
    }

    // Program Ops Staff (5)
    for (let i = 0; i < 5; i++) {
        const u = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                password: 'password123',
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                roles: [Roles.PROGRAM_OPERATION_STAFF],
                isActive: true,
                isVerified: true,
                department: 'Operations'
            }
        });
        users.push(u);
    }

    // New Staff (3) - No uploads
    for (let i = 0; i < 3; i++) {
        const u = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                password: 'password123',
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                roles: [Roles.NEW_STAFF],
                isActive: true,
                isVerified: true,
                department: 'Onboarding'
            }
        });
        users.push(u);
    }

    // // Guest/Basic Users
    // for (let i = 0; i < 10; i++) {
    //     const u = await prisma.user.create({
    //         data: {
    //             email: faker.internet.email(),
    //             password: 'password123',
    //             firstName: faker.person.firstName(),
    //             lastName: faker.person.lastName(),
    //             roles: [Roles.GUEST], // Assuming GUEST or similar for basic staff
    //             isActive: true,
    //             isVerified: true
    //         }
    //     });
    //     users.push(u);
    // }

    logger.log(`Created ${users.length} users.`);

    // --- Projects ---
    const projectCategories = [ProjectCategory.SCIDAR, ProjectCategory.SOLINA_HEALTH];
    const managementUsers = users.filter(u => u.roles.includes(Roles.MANAGEMENT_STAFF));
    const opsUsers = users.filter(u => u.roles.includes(Roles.PROGRAM_OPERATION_STAFF));

    for (let i = 0; i < 8; i++) {
        const members = faker.helpers.arrayElements(opsUsers, { min: 1, max: 2 });
        const managers = faker.helpers.arrayElements(managementUsers, { min: 1, max: 2 });
        const memberIds = members.map(m => m.id);
        const managerIds = managers.map(m => m.id);

        const p = await prisma.project.create({
            data: {
                name: faker.company.catchPhrase(),
                category: faker.helpers.arrayElement(projectCategories),
                status: Status.ACTIVE,
                description: faker.lorem.sentence(),
                membersIDs: memberIds,
                managersIDs: managerIds,
                createdByUserId: admin.id, // Admin created
            }
        });
        projects.push(p);

        // Update users relations (Prisma might handle this via array IDs but explicit connection helps if using relations)
        // With MongoDB schema using ID arrays, we need to update the User side too if we want `user.projectMemberProjects` to work?
        // Schema definition:
        // projectMemberIDs String[] @db.ObjectId
        // projectMemberProjects Project[] @relation(fields: [projectMemberProjectIDs], references: [id])
        // So we need to push project ID to user's arrays.

        for (const m of members) {
            await prisma.user.update({
                where: { id: m.id },
                data: { projectMemberProjectIDs: { push: p.id } }
            });
        }
        for (const m of managers) {
            await prisma.user.update({
                where: { id: m.id },
                data: { projectManagerProjectIDs: { push: p.id } }
            });
        }
    }
    logger.log(`Created ${projects.length} projects.`);

    // --- Files & Uploads ---
    // "Users should all have files that they uploaded except the new staff"
    // "Admins should not have affiliated projects" -> Admin created projects but is not member/manager. Correct.

    // const eligibleUploaders = users.filter(u => !u.roles.includes(Roles.NEW_STAFF));

    // const bulkOps: any[] = [];

    // for (const user of eligibleUploaders) {
    //     // Random number of files 5-20
    //     const fileCount = faker.number.int({ min: 5, max: 20 });

    //     for (let j = 0; j < fileCount; j++) {
    //         // Pick a project if they are affiliated, else global/private?
    //         // Ops/Mgmt are affiliated. 
    //         let project = null;
    //         if (user.roles.includes(Roles.PROGRAM_OPERATION_STAFF) || user.roles.includes(Roles.MANAGEMENT_STAFF)) {
    //             // Find their projects
    //             const userProjects = projects.filter(p => p.membersIDs.includes(user.id) || p.managersIDs.includes(user.id));
    //             if (userProjects.length > 0) {
    //                 project = faker.helpers.arrayElement(userProjects);
    //             }
    //         }

    //         const uploadDate = faker.date.past({ years: 1 });
    //         const doc = await prisma.file.create({
    //             data: {
    //                 originalFilename: faker.system.commonFileName(faker.system.commonFileExt()),
    //                 filename: faker.system.fileName(),
    //                 path: faker.system.filePath(),
    //                 uploaderId: user.id,
    //                 size: faker.number.int({ min: 1000, max: 10000000 }),
    //                 fileType: 'application/pdf', // Mock
    //                 uploadDate: uploadDate,
    //                 visibility: DocumentVisibility.PRIVATE, // or PUBLIC
    //                 projectsIDs: project ? [project.id] : [],
    //                 views: faker.number.int({ min: 0, max: 100 }),
    //                 downloads: faker.number.int({ min: 0, max: 50 }),
    //                 contentType: 'application/pdf'
    //             }
    //         });
    //         files.push(doc);

    //         // Update stats
    //         await prisma.dailyUploadStat.upsert({
    //             where: { date: uploadDate }, // Should probably truncate to day
    //             update: { uploads: { increment: 1 }, totalSize: { increment: doc.size } },
    //             create: { date: uploadDate, uploads: 1, totalSize: doc.size }
    //         });

    //         // Activity Log: Upload
    //         await prisma.activityLog.create({
    //             data: {
    //                 userId: user.id,
    //                 verb: ActivityVerb.CREATE,
    //                 entity: ActivityEntity.FILE,
    //                 entityId: doc.id,
    //                 occurredAt: uploadDate,
    //                 createdAt: uploadDate,
    //                 outcome: ActivityOutcome.SUCCESS,
    //                 metadata: { description: `Uploaded ${doc.originalFilename}` }
    //             }
    //         });

    //         if (bulkOps.length > 0) {
    //             console.log('ES bulk sample:', JSON.stringify(bulkOps.slice(0, 2), null, 2));
    //             await searchService.insertIndex(bulkOps);
    //         }

    //         // Index in ES
    //         if (process.env.IS_SEEDING !== 'true') {
    //             bulkOps.push(
    //                 { index: { _index: 'documents', _id: doc.id } },
    //                 {
    //                     filename: doc.originalFilename,
    //                     path: doc.path,
    //                     uploaderId: doc.uploaderId,
    //                     projectId: project?.id,
    //                     content: 'Mock content for search',
    //                     createdAt: doc.uploadDate,
    //                 }
    //             );

    //             if (bulkOps.length >= 1000) {
    //                 await searchService.insertIndex(bulkOps);
    //                 bulkOps.length = 0;
    //             }

    //         }


    //         // --- Approval Requests ---
    //         // If project file, generate requests
    //         if (project) {
    //             const status = faker.helpers.arrayElement([ApprovalStatus.PENDING, ApprovalStatus.APPROVED, ApprovalStatus.DECLINED]);
    //             let approvedBy = null;
    //             let disapprovedBy = null;

    //             if (status === ApprovalStatus.APPROVED) {
    //                 // Approved by a manager of the project
    //                 const managers = users.filter(u => project.managersIDs.includes(u.id));
    //                 if (managers.length > 0) approvedBy = faker.helpers.arrayElement(managers).id;
    //             } else if (status === ApprovalStatus.DECLINED) {
    //                 const managers = users.filter(u => project.managersIDs.includes(u.id));
    //                 if (managers.length > 0) disapprovedBy = faker.helpers.arrayElement(managers).id;
    //             }

    //             await prisma.approvalRequest.create({
    //                 data: {
    //                     documentId: doc.id,
    //                     projectId: project.id,
    //                     submittedById: user.id,
    //                     status: status,
    //                     approvedById: approvedBy,
    //                     disapprovedById: disapprovedBy,
    //                     createdAt: uploadDate,
    //                     updatedAt: faker.date.recent({ days: 10, refDate: uploadDate })
    //                 }
    //             });
    //         }
    //     }
    // }
    // logger.log(`Created ${files.length} files.`);

    const eligibleUploaders = users.filter(u => !u.roles.includes(Roles.NEW_STAFF));
    const bulkOps: any[] = [];

    for (const user of eligibleUploaders) {
        // Random number of files 5-20
        const fileCount = faker.number.int({ min: 5, max: 40 });

        for (let j = 0; j < fileCount; j++) {
            // 1. Identify associated project (if any)
            let project = null;
            if (user.roles.includes(Roles.PROGRAM_OPERATION_STAFF) || user.roles.includes(Roles.MANAGEMENT_STAFF)) {
                const userProjects = projects.filter(p =>
                    p.membersIDs.includes(user.id) || p.managersIDs.includes(user.id)
                );
                if (userProjects.length > 0) {
                    project = faker.helpers.arrayElement(userProjects);
                }
            }

            const uploadDate = faker.date.past({ years: 1 });

            // 2. Create the File record
            const doc = await prisma.file.create({
                data: {
                    originalFilename: faker.system.commonFileName(faker.system.commonFileExt()),
                    filename: faker.system.fileName(),
                    path: faker.system.filePath(),
                    uploaderId: user.id,
                    size: faker.number.int({ min: 1000, max: 10000000 }),
                    fileType: 'application/pdf',
                    uploadDate: uploadDate,
                    visibility: Math.random() > 0.8 ? DocumentVisibility.PUBLIC : DocumentVisibility.PRIVATE,
                    projectsIDs: project ? [project.id] : [],
                    views: faker.number.int({ min: 0, max: 100 }),
                    downloads: faker.number.int({ min: 0, max: 50 }),
                    contentType: 'application/pdf'
                }
            });
            files.push(doc);

            // 3. Update Daily Stats (Truncate date to midnight so upsert hits the same day)
            const statsDate = new Date(uploadDate);
            statsDate.setHours(0, 0, 0, 0);

            await prisma.dailyUploadStat.upsert({
                where: { date: statsDate },
                update: {
                    uploads: { increment: 1 },
                    totalSize: { increment: doc.size }
                },
                create: {
                    date: statsDate,
                    uploads: 1,
                    totalSize: doc.size
                }
            });

            // 4. Create Activity Log
            await prisma.activityLog.create({
                data: {
                    userId: user.id,
                    verb: ActivityVerb.CREATE,
                    entity: ActivityEntity.FILE,
                    entityId: doc.id,
                    occurredAt: uploadDate,
                    createdAt: uploadDate,
                    outcome: ActivityOutcome.SUCCESS,
                    metadata: { description: `Uploaded ${doc.originalFilename}` }
                }
            });

            // 5. Prepare Elasticsearch Bulk Indexing
            // We push PAIRS: [Action Metadata, Document Data]
            bulkOps.push(
                { index: { _index: 'documents', _id: doc.id } },
                {
                    originalFilename: doc.originalFilename,
                    visibility: doc.visibility,
                    path: doc.path,
                    fileType: doc.fileType,
                    uploaderId: doc.uploaderId,
                    projectId: project?.id,
                    content: 'Mock content for search',
                    createdAt: doc.uploadDate,
                }
            );

            // Periodically flush bulk operations to ES to avoid massive memory usage
            if (bulkOps.length >= 200) {
                await searchService.insertIndex([...bulkOps]);
                bulkOps.length = 0;
            }

            // 6. Generate Approval Requests for project files
            if (project) {
                const status = faker.helpers.arrayElement([
                    ApprovalStatus.PENDING,
                    ApprovalStatus.APPROVED,
                    ApprovalStatus.DECLINED
                ]);

                let approvedBy = null;
                let disapprovedBy = null;

                const projectManagers = users.filter(u => project.managersIDs.includes(u.id));

                if (status === ApprovalStatus.APPROVED && projectManagers.length > 0) {
                    approvedBy = faker.helpers.arrayElement(projectManagers).id;
                } else if (status === ApprovalStatus.DECLINED && projectManagers.length > 0) {
                    disapprovedBy = faker.helpers.arrayElement(projectManagers).id;
                }

                await prisma.approvalRequest.create({
                    data: {
                        documentId: doc.id,
                        projectId: project.id,
                        submittedById: user.id,
                        status: status,
                        approvedById: approvedBy,
                        disapprovedById: disapprovedBy,
                        createdAt: uploadDate,
                        updatedAt: faker.date.recent({ days: 10, refDate: uploadDate })
                    }
                });
            }
        }
    }

    // Final flush for any remaining ES operations
    if (bulkOps.length > 0) {
        await searchService.insertIndex(bulkOps);
    }

    logger.log(`Created ${files.length} files and indexed them in Elasticsearch.`);

    // --- More Activity Logs (Views, Logins) ---
    logger.log('Generating extra activity logs...');
    for (const u of users) {
        // Logins
        const logins = faker.number.int({ min: 5, max: 50 });
        for (let k = 0; k < logins; k++) {
            const date = faker.date.past({ years: 1 });
            await prisma.activityLog.create({
                data: {
                    userId: u.id,
                    verb: ActivityVerb.LOGIN,
                    entity: ActivityEntity.AUTH,
                    occurredAt: date,
                    createdAt: date,
                    outcome: ActivityOutcome.SUCCESS
                }
            });

            // Failed Login (Security Event)
            if (Math.random() > 0.9) {
                await prisma.activityLog.create({
                    data: {
                        userId: u.id,
                        verb: ActivityVerb.LOGIN,
                        entity: ActivityEntity.AUTH,
                        occurredAt: faker.date.recent({ days: 1, refDate: date }),
                        createdAt: faker.date.recent({ days: 1, refDate: date }),
                        outcome: ActivityOutcome.FAILURE,
                        securityEvent: SecurityEventType.FAILED_LOGIN,
                        metadata: { reason: 'Wrong password' }
                    }
                });
            }
        }

        // Views
        const views = faker.number.int({ min: 10, max: 100 });
        for (let k = 0; k < views; k++) {
            const date = faker.date.past({ years: 1 });
            await prisma.activityLog.create({
                data: {
                    userId: u.id,
                    verb: ActivityVerb.VIEW,
                    entity: ActivityEntity.FILE,
                    entityId: faker.helpers.arrayElement(files).id, // Random file
                    occurredAt: date,
                    createdAt: date,
                    outcome: ActivityOutcome.SUCCESS
                }
            });
        }
    }

    if (bulkOps.length > 0) {
        await searchService.insertIndex(bulkOps);
    }

    logger.log('Seeding complete!');
    await app.close();
}

bootstrap();
