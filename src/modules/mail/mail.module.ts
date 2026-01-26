import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MAIL_FROM,
  MAIL_HOST,
  MAIL_PASSWORD,
  MAIL_PORT,
  MAIL_USER,
} from '@constants/env.constants';
import { MailService } from '@modules/mail/services/mail.service';
import { MailController } from './controllers/mail.controller';

import { CaslModule } from '@modules/casl';
import { permissions } from './mail.permissions';

@Global() // 👈 global module
@Module({
  imports: [
    ConfigModule,
    CaslModule.forFeature({ permissions }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow(MAIL_HOST),
          port: configService.getOrThrow(MAIL_PORT),
          secure: true,
          auth: {
            user: configService.getOrThrow(MAIL_USER),
            pass: configService.getOrThrow(MAIL_PASSWORD),
          },
          debug: true, // <-- Enable Nodemailer debugging
          logger: true, // <-- Log to console
        },
        defaults: {
          from: `"SCIDaR DRS" <${configService.get(MAIL_FROM)}>`,
        },
        template: {
          dir: __dirname + '/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
