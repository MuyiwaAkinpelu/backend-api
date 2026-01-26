import { Controller, Get, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { DashboardService } from '../services/dashboard.service';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { UserService } from '@modules/user/user.service';
import { Request } from 'express';
import { Roles } from '@prisma/client';
import { UploadTrendsDTO, UserActivityDTO } from '../dtos/analytics.dto';

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
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 30);
        // Using 'CUSTOM' period as we are calculating specific dates here for the default view
        // Or if DTO has period, use it. But for now matching the manual date logic.
        return this.analyticsService.getUploadTrends('CUSTOM', from, to);
    }

    @Get('user-activity')
    getUserActivity(@Query() dto: UserActivityDTO) {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 7);
        return this.analyticsService.getUserActivity(from, to);
    }

    @Get('security-audit')
    getSecurityAudit() {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 30);
        return this.analyticsService.getSecurityAudit(from, to);
    }
    @Get('overview')
    @UseGuards(AuthGuard)
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
