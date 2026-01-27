import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { User, Roles, ApprovalStatus } from '@prisma/client';
import { UserAnalyticsService } from './user-analytics.service';
import { ProjectAnalyticsService } from './project-analytics.service';
import { SecurityAnalyticsService } from './security-analytics.service';
import { DocumentAnalyticsService } from './document-analytics.service';
import { ApprovalAnalyticsService } from './approval-analytics.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private docAnalytics: DocumentAnalyticsService,
        private userAnalytics: UserAnalyticsService,
        private projectAnalytics: ProjectAnalyticsService,
        private securityAnalytics: SecurityAnalyticsService,
        private approvalAnalytics: ApprovalAnalyticsService,
    ) { }

    async getStats(user: User) {
        if (!user || !user.roles) {
            throw new ForbiddenException('User data incomplete');
        }

        try {
            if (user.roles.includes(Roles.SYSTEM_ADMIN)) {
                return await this.getSystemAdminStats();
            }
            else if (user.roles.includes(Roles.MANAGEMENT_STAFF)) {
                return await this.getManagementStaffStats(user);
            }
            else if (user.roles.includes(Roles.PROGRAM_OPERATION_STAFF)) {
                return await this.getOperationalStaffStats(user);
            }
            else if (user.roles.includes(Roles.NEW_STAFF)) {
                return await this.getNewStaffStats(user);
            }

            throw new ForbiddenException('No dashboard available for this role');
        } catch (error) {
            this.logger.error(`Error getting dashboard stats for user ${user.id}: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async getSystemAdminStats() {
        const [
            docStats,
            approvalStats,
            projects
        ] = await Promise.all([
            this.docAnalytics.getSummaryStats({ approvalRequests: { some: {} } }),
            this.approvalAnalytics.getSummaryStats(),
            this.projectAnalytics.getProjects(3)
        ]);

        const projectIds = projects.map(p => p.id);
        const [
            recentGlobalApprovedUploads,
            approvedRequests,
            mostViewed,
            recentApprovedMetric,
            projectsStats
        ] = await Promise.all([
            this.docAnalytics.recentUploads(6, { approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }),
            this.approvalAnalytics.recentApproved(6),
            this.docAnalytics.mostViewed(6, { approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }),
            this.docAnalytics.getMetricWithTrend({ approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }, true),
            this.projectAnalytics.getProjectsStatsBatch(projectIds)
        ]);

        const projectsWithStats = projects.map(p => {
            const stats = projectsStats.get(p.id);
            return {
                ...p,
                documentCount: stats.totalSubmitted,
                memberCount: p._count.members,
                managerCount: p.managers.length,
                declinedDocumentCount: stats.declined,
                approvedDocumentCount: stats.approved,
                unapprovedDocumentCount: stats.pending,
                approvalRatio: stats.approved > 0
                    ? `${stats.pending}:${stats.approved}`
                    : `${stats.pending}:0`
            };
        });

        return {
            success: true,
            data: {
                cards: {
                    totalDocuments: docStats.totalDocuments,
                    pendingApprovals: approvalStats.pending,
                    declinedApprovals: approvalStats.declined,
                    recentUploads: recentApprovedMetric,
                    totalDownloads: docStats.totalDownloads
                },
                projects: projectsWithStats,
                dynamicColumn: {
                    title: "Recently Approved",
                    data: approvedRequests
                },
                recentUploads: recentGlobalApprovedUploads.map(u => ({ ...u, status: ApprovalStatus.APPROVED })),
                mostViewed
            },
        };
    }


    private async getManagementStaffStats(user: User) {
        const projectIds = [...(user.projectManagerProjectIDs || []), ...(user.projectMemberProjectIDs || [])];

        const [
            docStats,
            approvalStats,
            projects
        ] = await Promise.all([
            this.docAnalytics.getSummaryStats({ projectsIDs: { hasSome: projectIds }, approvalRequests: { some: {} } }),
            this.approvalAnalytics.getSummaryStats({ projectId: { in: projectIds } }),
            this.projectAnalytics.getProjects(3, { id: { in: projectIds } })
        ]);

        const dashboardProjectIds = projects.map(p => p.id);
        const [
            recentApprovedUploads,
            mostViewed,
            recentApprovedGlobal,
            recentUploadsMetric,
            projectsStats
        ] = await Promise.all([
            this.docAnalytics.recentUploads(6, {
                approvalRequests: { some: { status: ApprovalStatus.APPROVED } }
            }),
            this.docAnalytics.mostViewed(6, {
                approvalRequests: { some: { status: ApprovalStatus.APPROVED } }
            }),
            this.approvalAnalytics.recentApproved(6),
            this.docAnalytics.getMetricWithTrend({ projectsIDs: { hasSome: projectIds }, approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }, true),
            this.projectAnalytics.getProjectsStatsBatch(dashboardProjectIds)
        ]);

        const projectsWithStats = projects.map(p => {
            const stats = projectsStats.get(p.id);

            return {
                ...p,
                documentCount: stats.totalSubmitted,
                memberCount: p._count.members,
                managerCount: p.managers.length,
                declinedDocumentCount: stats.declined,
                approvedDocumentCount: stats.approved,
                unapprovedDocumentCount: stats.pending,
                approvalRatio: stats.approved > 0
                    ? `${stats.pending}:${stats.approved}`
                    : `${stats.pending}:0`
            };
        });

        return {
            success: true,
            data: {
                cards: {
                    totalDocuments: docStats.totalDocuments,
                    pendingApprovals: approvalStats.pending,
                    declinedApprovals: approvalStats.declined,
                    recentUploads: recentUploadsMetric,
                    totalDownloads: docStats.totalDownloads
                },
                projects: projectsWithStats,
                dynamicColumn: {
                    title: "Recently Approved",
                    data: recentApprovedGlobal
                },
                recentUploads: recentApprovedUploads,
                mostViewed
            },
        };
    }

    private async getOperationalStaffStats(user: User) {
        const projectIds = user.projectMemberProjectIDs || [];

        const [
            docStats,
            submissionStats
        ] = await Promise.all([
            this.docAnalytics.getSummaryStats({ uploaderId: user.id, approvalRequests: { some: {} } }),
            this.approvalAnalytics.getSummaryStats({ submittedById: user.id })
        ]);

        const affiliatedProjectsCount = projectIds.length;

        const [
            recentGlobalApprovedUploads,
            mostViewed,
            mySubmissions,
            projects,
            myRecentUploadsMetric
        ] = await Promise.all([
            this.docAnalytics.recentUploads(6, { approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }),
            this.docAnalytics.mostViewed(6, { approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }),
            this.approvalAnalytics.getMySubmissions(user.id, 6),
            this.projectAnalytics.getProjects(3, { id: { in: projectIds } }),
            this.docAnalytics.getMetricWithTrend({ uploaderId: user.id, approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }, true)
        ]);

        const dashboardProjectIds = projects.map(p => p.id);
        const projectsStats = await this.projectAnalytics.getProjectsStatsBatch(dashboardProjectIds);

        const projectsWithStats = projects.map(p => {
            const stats = projectsStats.get(p.id);
            return {
                ...p,
                documentCount: stats.totalSubmitted,
                memberCount: p._count.members,
                managerCount: p.managers.length,
                declinedDocumentCount: stats.declined,
                approvedDocumentCount: stats.approved,
                unapprovedDocumentCount: stats.pending,
                approvalRatio: stats.approved > 0
                    ? `${stats.pending}:${stats.approved}`
                    : `${stats.pending}:0`
            };
        });

        return {
            success: true,
            data: {
                cards: {
                    myTotalDocuments: docStats.totalDocuments,
                    myPendingDocs: submissionStats.pending,
                    myDeclinedDocs: submissionStats.declined,
                    myApprovedDocs: submissionStats.approved,
                    myRecentUploads: myRecentUploadsMetric,
                    affiliatedProjects: affiliatedProjectsCount
                },
                projects: projectsWithStats,
                dynamicColumn: {
                    title: "My Submission Status",
                    data: mySubmissions
                },
                recentUploads: recentGlobalApprovedUploads,
                mostViewed
            }
        };
    }

    private async getNewStaffStats(user: User) {
        // "Basic Staff"
        const docStats = await this.docAnalytics.getSummaryStats({ approvalRequests: { some: {} } });
        const activeProjects = await this.projectAnalytics.activeProjects();

        return {
            success: true,
            data: {
                landingCards: {
                    totalDocuments: docStats.totalDocuments,
                    activeProjects
                }
            }
        };
    }
}