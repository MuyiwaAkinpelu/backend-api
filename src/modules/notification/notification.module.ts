import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationHelperService } from './services/notification-helper.service';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '@modules/user/user.module';
import { CaslModule } from '@modules/casl';
import { permissions } from './notification.permission';

@Module({
  imports: [
    JwtModule.register({}),
    UserModule,
    CaslModule.forFeature({ permissions }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationPreferenceService,
    NotificationHelperService,
    NotificationRepository,
    NotificationGateway,
  ],
  exports: [NotificationService, NotificationPreferenceService],
})
export class NotificationModule {}
