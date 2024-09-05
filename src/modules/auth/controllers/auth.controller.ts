import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Request,
  BadRequestException,
  Ip,
  Version,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SignUpDto } from '../dto/sign-up.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { TokenUseCase, User } from '@prisma/client';
import Serialize from '@decorators/serialize.decorator';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import { SignInDto } from '@modules/auth/dto/sign-in.dto';
import { SkipAuth } from '@modules/auth/guard/skip-auth.guard';
import RefreshTokenDto from '@modules/auth/dto/refresh-token.dto';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import { TokensEntity } from '@modules/auth/entities/tokens.entity';
import { VerifyOTPDto } from '../dto/verify-otp.dto';
import { TokenService } from '../token.service';
import { PasswordResetService } from '../password-reset.service';
import { RequestResetPasswordDto } from '../dto/request-reset-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@ApiTags('Auth')
@ApiBaseResponses()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Version('1')
  @ApiBody({ type: SignUpDto })
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Create user account' })
  @Post('sign-up')
  create(@Body() signUpDto: SignUpDto): Promise<User> {
    const { password, ...rest } = signUpDto;

    return this.authService.createAccount({
      ...rest,
      password: password || 'String!12345',
    });
  }

  @Version('1')
  @ApiBody({ type: SignInDto })
  @SkipAuth()
  @ApiOperation({ summary: 'Sign-in to user account' })
  @Post('sign-in')
  async signIn(
    @Body() signInDto: SignInDto,
    @Request() req: any,
    @Ip() deviceIp: string,
  ): Promise<Auth.AccessRefreshTokens> {
    return this.authService.signIn(signInDto, deviceIp);
  }

  @Version('1')
  @ApiBody({ type: VerifyOTPDto })
  @SkipAuth()
  @ApiOperation({ summary: 'Verify sign-in OTP' })
  @Post('verify-otp')
  async verifyOTP(@Body() verifyOTPDto: VerifyOTPDto, @Request() req: any) {
    const deviceIp = req.ip;
    const { email, otp } = verifyOTPDto;

    const user = await this.authService.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid OTP');
    }

    // Verify OTP
    const isOTPValid = await this.tokenService.verify(
      user.id,
      otp,
      TokenUseCase.LOGIN,
    );

    if (!isOTPValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Proceed with regular authentication
    return this.authService.sign(user, deviceIp);
  }

  @Version('1')
  @ApiBody({ type: RefreshTokenDto })
  @SkipAuth()
  @ApiOperation({ summary: 'Refresh authentication token' })
  @Post('token/refresh')
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Version('1')
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign-out user session' })
  @UseGuards(AccessGuard)
  @HttpCode(204)
  @UseAbility(Actions.delete, TokensEntity)
  async logout(@CaslUser() userProxy?: UserProxy<User>) {
    const { accessToken } = await userProxy.getMeta();
    const { id: userId } = await userProxy.get();

    return this.authService.logout(userId, accessToken);
  }

  @Version('1')
  @SkipAuth()
  @ApiOperation({ summary: 'Request password reset' })
  @Post('password-reset/request')
  async requestPasswordReset(
    @Body() requestResetPasswordDto: RequestResetPasswordDto,
  ) {
    await this.passwordResetService.requestPasswordReset(
      requestResetPasswordDto.email,
    );
    return {
      message: 'Password reset email sent successfully',
    };
  }

  @Version('1')
  @SkipAuth()
  @ApiOperation({ summary: 'Reset password' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  @Post('password-reset/reset')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(
      resetPasswordDto.userId,
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return {
      message: 'Password reset successfully',
    };
  }
}
