import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './controllers/auth.controller';
import { UserRepository } from '@modules/user/user.repository';
import { AuthTokenService } from '@modules/auth/auth-token.service';
import { TokenRepository } from '@modules/auth/token.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/auth/auth.permissions';
import { RedisService } from './redis.service';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [CaslModule.forFeature({ permissions })],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    TokenService,
    UserRepository,
    PasswordResetService,
    TokenRepository,
    RedisService,
  ],
  exports: [AuthTokenService, AuthService, TokenService, RedisService],
})
export class AuthModule { }
