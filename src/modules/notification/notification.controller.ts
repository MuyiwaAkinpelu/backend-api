import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { AccessGuard, CaslUser, UserProxy } from '@modules/casl';
import { User } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  @ApiOperation({ summary: 'Get notification preferences' })
  @Get('preferences')
  async getPreferences(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    return this.preferenceService.getPreferences(user.id);
  }

  @ApiOperation({ summary: 'Update notification preferences' })
  @Patch('preferences')
  async updatePreferences(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    const user = await userProxy.get();
    return this.preferenceService.updatePreferences(user.id, dto);
  }
}
