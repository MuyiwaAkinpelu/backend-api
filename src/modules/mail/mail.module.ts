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

@Global() // 👈 global module
@Module({
  imports: [
    ConfigModule,
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
        },
        defaults: {
          from: `"No Reply" <${configService.get(MAIL_FROM)}>`,
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
export class MailModule {}
