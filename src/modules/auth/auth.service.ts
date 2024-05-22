import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRepository } from '@modules/user/user.repository';
import {
  INVALID_CREDENTIALS,
  MFA_PHONE_OR_TOKEN_REQUIRED,
  NOT_FOUND,
  USER_CONFLICT,
} from '@constants/errors.constants';
import { TokenUseCase, User } from '@prisma/client';
import { SignInDto } from '@modules/auth/dto/sign-in.dto';
import { AuthTokenService } from '@modules/auth/auth-token.service';
import { RedisService } from './redis.service';
import { MailService } from '@modules/mail/services/mail.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
  ) {}

  /**
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
   * @desc Sign in a user
   * @returns Auth.AccessRefreshTokens - Access and refresh tokens
   * @throws NotFoundException - User not found
   * @throws UnauthorizedException - Invalid credentials
   * @param signInDto - User credentials
   */
  async signIn(
    signInDto: SignInDto,
    deviceIp: string,
  ): Promise<Auth.AccessRefreshTokens> {
    const testUser = await this.getUserByEmail(signInDto.email);

    if (!testUser) {
      // 404001: User not found
      throw new NotFoundException(NOT_FOUND);
    }

    if (
      !(await this.authTokenService.isPasswordCorrect(
        signInDto.password,
        testUser.password,
      ))
    ) {
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Check if device exists in Redis
    const isNewDevice = await this.isDeviceIPNew(testUser.id, deviceIp);

    if (isNewDevice) {
      // Generate OTP
      const otp = await this.tokenService.create(
        testUser.id,
        TokenUseCase.LOGIN,
      );

      // Send OTP via email
      await this.mailService.sendOTPConirmation(testUser.email, {
        otp: otp.code,
      });
      Logger.debug(otp.code, 'OTP');
      // 400004: Phone number or token is required
      throw new BadRequestException(MFA_PHONE_OR_TOKEN_REQUIRED);
    }

    return this.sign(testUser, deviceIp);
  }

  async sign(user: User, deviceIp: string) {
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
      },
    });
  }

  refreshTokens(
    refreshToken: string,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.authTokenService.refreshTokens(refreshToken);
  }

  logout(userId: string, accessToken: string): Promise<void> {
    return this.authTokenService.logout(userId, accessToken);
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
}
