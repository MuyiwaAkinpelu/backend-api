import { Controller, Get, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { DashboardService } from '../services/dashboard.service';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { UserService } from '@modules/user/user.service';
import { Request } from 'express';
import { Roles } from '@prisma/client';
import { UploadTrendsDTO, UserActivityDTO } from '../dtos/analytics.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { AccessGuard, Actions, UseAbility } from '@modules/casl';

@SkipThrottle()
@Controller('analytics')
export class AnalyticsController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly dashboardService: DashboardService,
        private readonly userService: UserService,
    ) { }

    @Get('dashboard')
    @UseGuards(AuthGuard)
    async getDashboardStats(@Req() req: any) {
        const userId = req.user?.id;
        if (!userId) {
            throw new UnauthorizedException();
        }

        // Fetch full user with roles and project IDs
        const user = await this.userService.findById(userId);

        return this.dashboardService.getStats(user);
    }

    @Get('upload-trends')
    getUploadTrends(@Query() dto: UploadTrendsDTO) {
        return this.analyticsService.getUploadTrends(dto.period, dto.from, dto.to);
    }

    @Get('user-activity')
    getUserActivity(@Query() dto: UserActivityDTO) {
        return this.analyticsService.getUserActivityByTimeframe(dto.timeframe);
    }

    @Get('security-audit')
    getSecurityAudit() {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 30);
        return this.analyticsService.getSecurityAudit(from, to);
    }

    @Get('audit-logs')
    getAuditLogs() {
        return this.analyticsService.getAuditLogs();
    }

    @Get('overview')
    @UseGuards(AuthGuard)
    // @UseGuards(AccessGuard)
    // @UseAbility(Actions.read, Analytics)
    async getAdminAnalytics(@Req() req: any) {
        const userId = req.user?.id;
        if (!userId) {
            throw new UnauthorizedException();
        }
        const user = await this.userService.findById(userId);
        // Check for admin role
        if (!user.roles.includes(Roles.SYSTEM_ADMIN)) {
            throw new UnauthorizedException("Insufficient permissions");
        }
        return this.analyticsService.getAdminAnalytics();
    }
}
