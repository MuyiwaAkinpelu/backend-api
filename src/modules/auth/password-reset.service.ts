import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '@providers/prisma';
import { MailService } from '@modules/mail/services/mail.service';
import { ActivityEntity, ActivityOutcome, ActivityVerb, SecurityEventType, TokenType, TokenUseCase } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityLogEvent, ActivityAction } from '@modules/activity-logs/constants';

import { ConfigService } from '@nestjs/config';
import { CLIENT_URL } from '@constants/env.constants';

@Injectable()
export class PasswordResetService {
  private clientURL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.clientURL = this.configService.getOrThrow(CLIENT_URL);
  }


  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    const token = await this.tokenService.create(
      user.id,
      TokenUseCase.PWD_RESET,
      TokenType.HEX,
    );

    const link = `${this.clientURL}/reset-password/${token.code}/?u=${user.id}`;
    console.log(link);

    // Send the OTP to the user's email
    await this.mailService.sendPasswordResetEmail(user.email, {
      name: `${user.firstName} ${user.lastName}`,
      link,
      expiresAt: token.expiresAt,
    });

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: user.id,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.PASSWORD_RESET,
      metadata: {
        action: ActivityAction.PASSWORD_RESET_REQUESTED,
        email: email,
      },

      occurredAt: new Date(),
    });
  }


  async newAccountResetLink(id) {
    const token = await this.tokenService.create(
      id,
      TokenUseCase.PWD_RESET,
      TokenType.HEX,
    );

    const link = `${this.clientURL}/setup-password/${token.code}/?u=${id}`;

    return link;
  }

  async resetPassword(userId: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const validToken = await this.tokenService.verify(
      user.id,
      token,
      TokenUseCase.PWD_RESET,
    );

    if (!validToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Update the user's password in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Send the OTP to the user's email
    await this.mailService.sendPasswordResetSuccess(user.email, {
      name: `${user.firstName} ${user.lastName}`,
    });

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: user.id,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.PASSWORD_RESET,
      metadata: {
        action: ActivityAction.PASSWORD_RESET_COMPLETED,
      },

      occurredAt: new Date(),
    });
  }

}
