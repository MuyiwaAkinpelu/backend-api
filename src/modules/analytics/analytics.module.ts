import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ActivityLogsModule } from '@modules/activity-logs/activity-logs.module';
import { AnalyticsListener } from './analytics.listener';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { DashboardService } from './services/dashboard.service';
import { DocumentAnalyticsService } from './services/document-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { ProjectAnalyticsService } from './services/project-analytics.service';
import { SecurityAnalyticsService } from './services/security-analytics.service';
import { ApprovalAnalyticsService } from './services/approval-analytics.service';
import { DailyUploadStatRepository } from './repositories/daily-upload-stat.repository';
import { UserActivityRepository } from './repositories/user-activity.repository';
import { ProjectDocumentStatRepository } from './repositories/project-document-stat.repository';
import { SecurityEventRepository } from './repositories/security-event.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from './analytics.permissions';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    forwardRef(() => AuthModule),
    ActivityLogsModule,
    CaslModule.forFeature({ permissions }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsListener,
    AnalyticsService,
    DashboardService,
    DocumentAnalyticsService,
    UserAnalyticsService,
    ProjectAnalyticsService,
    SecurityAnalyticsService,
    ApprovalAnalyticsService,
    DailyUploadStatRepository,
    UserActivityRepository,
    ProjectDocumentStatRepository,
    SecurityEventRepository,
  ],
  exports: [AnalyticsService, DashboardService],
})
export class AnalyticsModule {}
