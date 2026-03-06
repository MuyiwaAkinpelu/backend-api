import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRepository } from '@modules/user/user.repository';
import {
  ACCOUNT_NOT_ACTIVE,
  INVALID_CREDENTIALS,
  USER_CONFLICT,
} from '@constants/errors.constants';
import {
  ActivityEntity,
  ActivityOutcome,
  ActivityVerb,
  Roles,
  SecurityEventType,
  TokenUseCase,
  User,
} from '@prisma/client';
import { SignInDto } from '@modules/auth/dto/sign-in.dto';
import { AuthTokenService } from '@modules/auth/auth-token.service';
import { RedisService } from './redis.service';
import { MailService } from '@modules/mail/services/mail.service';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ActivityLogEvent,
  ActivityAction,
} from '@modules/activity-logs/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  private client: OAuth2Client;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly passwordResetService: PasswordResetService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.client = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  /**
   * DEPRECATED
   * @desc Create a new user
   * @param signUpDto
   * @returns Promise<User> - Created user
   * @throws ConflictException - User with this email or phone already exists
   */
  async singUp(signUpDto: SignUpDto): Promise<User> {
    const testUser: User = await this.userRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (testUser) {
      // 409001: User with this email or phone already exists
      throw new ConflictException(USER_CONFLICT);
    }

    return this.userRepository.create(signUpDto);
  }

  /**
   * @param signUpDto
   * @param performedBy The ID of the user performing the account creation.
   * @returns Promise<User> - Created user
   * @throws ConflictException - User with this email or phone already exists
   */
  async createAccount(
    signUpDto: SignUpDto,
    performedBy?: string,
  ): Promise<User> {
    const testUser: User = await this.userRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (testUser) {
      // 409001: User with this email or phone already exists
      throw new ConflictException(USER_CONFLICT);
    }

    const user = await this.userRepository.create(signUpDto);

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.CREATE,
      entity: ActivityEntity.USER,
      entityId: user.id,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        targetUserEmail: user.email,
      },
      occurredAt: new Date(),
    });

    const passwordResetLink =
      await this.passwordResetService.newAccountResetLink(user.id);

    console.log('passwordResetLink', passwordResetLink);

    try {
      const { firstName, lastName, email } = user;
      this.mailService.sendAccountCreationNotification(email, {
        fullName: `${firstName} ${lastName}`,
        passwordResetLink,
      });
    } catch (error) {
      this.logger.error(error);
    }

    return user;
  }

  /**
   * @desc Sign in a user
   * @returns Auth.AccessRefreshTokens - Access and refresh tokens
   * @throws NotFoundException - User not found
   * @throws UnauthorizedException - Invalid credentials
   * @param signInDto - User credentials
   */
  async signIn(
    signInDto: SignInDto,
    deviceIp: string,
    userAgent?: string,
  ): Promise<Auth.AccessRefreshTokens> {
    const testUser = await this.getUserByEmail(signInDto.email);

    if (!testUser) {
      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: undefined,
        verb: ActivityVerb.LOGIN,
        entity: ActivityEntity.AUTH,
        outcome: ActivityOutcome.FAILURE,
        securityEvent: SecurityEventType.FAILED_LOGIN,
        metadata: {
          outcome: ActivityOutcome.FAILURE,
          reason: 'USER_NOT_FOUND',
          securityEvent: SecurityEventType.FAILED_LOGIN,
          targetUserEmail: signInDto.email,
        },
        ip: deviceIp,
        userAgent,
        occurredAt: new Date(),
      });
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!testUser.isActive) {
      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: undefined,
        verb: ActivityVerb.LOGIN,
        entity: ActivityEntity.AUTH,
        outcome: ActivityOutcome.FAILURE,
        securityEvent: SecurityEventType.FAILED_LOGIN,
        metadata: {
          outcome: ActivityOutcome.FAILURE,
          reason: 'USER_NOT_ACTIVE',
          securityEvent: SecurityEventType.FAILED_LOGIN,
          targetUserEmail: signInDto.email,
        },
        ip: deviceIp,
        userAgent,
        occurredAt: new Date(),
      });
      throw new UnauthorizedException(ACCOUNT_NOT_ACTIVE);
    }

    if (
      !(await this.authTokenService.isPasswordCorrect(
        signInDto.password,
        testUser.password,
      ))
    ) {
      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: undefined,
        verb: ActivityVerb.LOGIN,
        entity: ActivityEntity.AUTH,
        outcome: ActivityOutcome.FAILURE,
        securityEvent: SecurityEventType.FAILED_LOGIN,
        metadata: {
          outcome: ActivityOutcome.FAILURE,
          reason: 'INVALID_PASSWORD',
          securityEvent: SecurityEventType.FAILED_LOGIN,
          targetUserEmail: signInDto.email,
        },
        ip: deviceIp,
        userAgent,
        occurredAt: new Date(),
      });
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Force 2FA for email/password login
    // Generate OTP
    const otp = await this.tokenService.create(
      testUser.id,
      TokenUseCase.LOGIN,
    );

    // Send OTP via email
    await this.mailService.sendOTPConfirmation(testUser.email, {
      otp: otp.code,
    });
    Logger.debug(otp.code, 'OTP');

    // Emit PENDING_MFA activity log
    this.eventEmitter.emitAsync(ActivityLogEvent.ACTIVITY_LOG, {
      userId: testUser.id,
      verb: ActivityVerb.LOGIN,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      metadata: {
        outcome: 'PENDING_MFA',
        reason: 'OTP_SENT',
      },
      ip: deviceIp,
      userAgent,
      occurredAt: new Date(),
    });

    throw new BadRequestException('OTP sent to your email. Please verify to continue.');
  }

  async resendOTP(email: string, deviceIp: string, userAgent?: string) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid request');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ACCOUNT_NOT_ACTIVE);
    }

    // Generate NEW OTP
    const otp = await this.tokenService.create(user.id, TokenUseCase.LOGIN);

    // Send OTP via email
    await this.mailService.sendOTPConfirmation(user.email, {
      otp: otp.code,
    });
    Logger.debug(otp.code, 'Resend OTP');

    // Log PENDING_MFA
    this.eventEmitter.emitAsync(ActivityLogEvent.ACTIVITY_LOG, {
      userId: user.id,
      verb: ActivityVerb.LOGIN,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      metadata: {
        outcome: 'PENDING_MFA',
        reason: 'OTP_RESENT',
      },
      ip: deviceIp,
      userAgent,
      occurredAt: new Date(),
    });

    return { message: 'OTP resent to your email.' };
  }

  async googleLogin(
    idToken: string,
    deviceIp: string,
    userAgent?: string,
  ): Promise<Auth.AccessRefreshTokens> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch (error) {
      console.log('error', error);
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleId, email, given_name, family_name, picture } = payload;

    let user = await this.userRepository.findOne({ where: { googleId } });

    if (!user) {
      user = await this.userRepository.findOne({ where: { email } });

      if (user) {
        user = await this.userRepository.updateUser(user.id, { googleId });
      } else {
        throw new UnauthorizedException(
          'Account not found. Please contact an administrator to create your account.',
        );
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ACCOUNT_NOT_ACTIVE);
    }

    return this.sign(user, deviceIp, userAgent, 'GOOGLE');
  }

  async sign(
    user: User,
    deviceIp: string,
    userAgent?: string,
    method = 'PASSWORD',
  ) {
    // update lastLogin date
    await this.userRepository.updateUser(user.id, {
      lastLogin: new Date(),
    });

    // Log SUCCESS activity
    this.eventEmitter.emitAsync(ActivityLogEvent.ACTIVITY_LOG, {
      userId: user.id,
      verb: ActivityVerb.LOGIN,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        outcome: 'SUCCESS',
        method,
      },
      ip: deviceIp,
      userAgent,
      occurredAt: new Date(),
    });

    // Save device to redis
    await this.saveDeviceIP(user.id, deviceIp);

    return this.authTokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  }

  async getUserByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        password: true,
        roles: true,
        isActive: true,
      },
    });
  }

  refreshTokens(
    refreshToken: string,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.authTokenService.refreshTokens(refreshToken);
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await this.authTokenService.logout(userId, accessToken);

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: userId,
      verb: ActivityVerb.LOGOUT,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      occurredAt: new Date(),
    });
  }

  async saveDeviceIP(userId: string, ip: string) {
    // Save device IP in Redis with expiration (e.g., 24 hours)
    await this.redisService.set(`device:${userId}:${ip}`, 86400);
    this.logger.log(ip, 'Users IP');
  }

  async isDeviceIPNew(userId: string, ip: string): Promise<boolean> {
    // Check if device IP is new by querying Redis
    const result = await this.redisService.exists(`device:${userId}:${ip}`);
    return result === 0; // Returns 0 if key doesn't exist (new device)
  }

  async resendAccountSetupInvite(
    userId: string,
    performedBy: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return;
    }

    if (user.lastLogin != null) {
      throw new BadRequestException('User has already set up their account');
    }

    // Generate new setup link
    const passwordResetLink =
      await this.passwordResetService.newAccountResetLink(user.id);

    // Send email
    try {
      this.mailService.sendAccountCreationNotification(user.email, {
        fullName: `${user.firstName} ${user.lastName}`,
        passwordResetLink,
      });
    } catch (error) {
      this.logger.error(error);
    }

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: performedBy,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.USER,
      entityId: userId,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: null,
      metadata: {
        targetUserEmail: user.email,
        action: ActivityAction.RESENT_INVITE,
      },

      occurredAt: new Date(),
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.authTokenService.isPasswordCorrect(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
        userId: userId,
        verb: ActivityVerb.UPDATE,
        entity: ActivityEntity.AUTH,
        outcome: ActivityOutcome.FAILURE,
        securityEvent: SecurityEventType.PASSWORD_CHANGE_FAILED,
        metadata: {
          outcome: ActivityOutcome.FAILURE,
          reason: 'INVALID_CURRENT_PASSWORD',
        },
        occurredAt: new Date(),
      });
      throw new BadRequestException(INVALID_CREDENTIALS);
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.userRepository.updateUser(userId, {
      password: hashedNewPassword,
    });

    this.eventEmitter.emit(ActivityLogEvent.ACTIVITY_LOG, {
      userId: userId,
      verb: ActivityVerb.UPDATE,
      entity: ActivityEntity.AUTH,
      outcome: ActivityOutcome.SUCCESS,
      securityEvent: SecurityEventType.PASSWORD_RESET,
      metadata: {
        action: ActivityAction.PASSWORD_CHANGED,
      },

      occurredAt: new Date(),
    });
  }
}
