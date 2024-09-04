import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { CLIENT_URL, CONTACT_EMAIL } from '@constants/env.constants';

@Injectable()
export class MailService {
  private siteUrl: string;
  private contactEmail: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {
    this.siteUrl = this.configService.get(CLIENT_URL);
    this.contactEmail = this.configService.get(CONTACT_EMAIL);
  }

  async sendOTPConfirmation(to: string, context?: any) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'OTP Confirmation',
        template: './otp-confirmation',
        context: {
          ...context,
          year: new Date().getFullYear(),
          website: this.siteUrl,
        },
      });
    } catch (error) {
      Logger.error('Error sending email', error.message);
    }
  }

  async sendApprovalRequestNotification(
    to: string[] | string,
    context: {
      projectName: string;
      documentName: string;
      requestedBy: string;
      submissionDate: string;
      reviewLink: string;
    },
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Approval Request Notification',
        template: './pending-approval',
        context: {
          ...context,
          year: new Date().getFullYear(),
          website: this.siteUrl,
        },
      });
    } catch (error) {
      Logger.error('Error sending email', error.message);
    }
  }

  async sendApprovalNotification(
    to: string,
    details: {
      documentName: string;
      approvalDate: string;
      requestedBy: string;
      projectLink: string;
    },
  ) {
    await this.mailerService.sendMail({
      to,
      subject: 'Your Document Has Been Approved',
      template: './approval-notification',
      context: {
        ...details,
        year: new Date().getFullYear(),
        website: this.siteUrl,
      },
    });
  }

  async sendDisapprovalNotification(
    to: string,
    details: {
      documentName: string;
      disapprovalDate: string;
      disapprovalReason: string;
      requestedBy: string;
      projectLink: string;
    },
  ) {
    await this.mailerService.sendMail({
      to,
      subject: 'Your Document Has Been Disapproved',
      template: './disapproval-reason',
      context: {
        ...details,
        year: new Date().getFullYear(),
        website: this.siteUrl,
      },
    });
  }

  async sendPasswordResetEmail(to: string, context?: any) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'OTP Confirmation',
        template: './request-reset-password',
        context: {
          ...context,
          year: new Date().getFullYear(),
          website: this.siteUrl,
        },
      });
    } catch (error) {
      Logger.error('Error sending email', error.message);
    }
  }

  async sendPasswordResetSuccess(to: string, context?: any) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Password Reset Successful',
        template: './reset-password',
        context: {
          ...context,
          year: new Date().getFullYear(),
          website: this.siteUrl,
        },
      });
    } catch (error) {
      Logger.error('Error sending email', error.message);
    }
  }

  async sendAccountCreationNotification(
    to: string,
    details: {
      fullName: string;
    },
  ) {
    await this.mailerService.sendMail({
      to,
      subject: 'Your Account has been created',
      template: './account-creation-notification',
      context: {
        ...details,
        year: new Date().getFullYear(),
        website: this.siteUrl,
        resetPasswordUrl: this.siteUrl + '/forgot-password',
      },
    });
  }
}
