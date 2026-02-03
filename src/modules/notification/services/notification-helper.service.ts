import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { UserService } from '@modules/user/user.service';

@Injectable()
export class NotificationHelperService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) { }

    async verifyTokenAndGetUser(token: string) {
        try {
            const secret = this.configService.get<string>('jwt.accessToken');
            if (!secret) {
                throw new InternalServerErrorException('Internal server error: JWT secret not found');
            }

            const payload = await this.jwtService.verifyAsync(token, {
                secret,
            });

            const user = await this.userService.findById(payload.id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            return {
                id: user.id,
                email: user.email,
            };
        } catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Auth token expired');
            }
            if (err instanceof NotFoundException) {
                throw new UnauthorizedException('User not found');
            }
            throw new UnauthorizedException('Auth token invalid');
        }
    }

    extractTokenFromSocket(client: Socket): string | undefined {
        let token = client.handshake.auth?.token as string;

        if (!token) {
            const authHeader = client.handshake.headers?.authorization;
            if (authHeader) {
                const [type, headerToken] = authHeader.split(' ') ?? [];
                if (type === 'Bearer') {
                    token = headerToken;
                }
            }
        }
        if (!token && typeof client.handshake.query?.token === 'string') {
            token = client.handshake.query.token;
        }

        return token;
    }
}
