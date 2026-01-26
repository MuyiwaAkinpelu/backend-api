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
            totalDocuments,
            pendingApprovals,
            declinedApprovals,
            totalDownloads,
            projects
        ] = await Promise.all([
            this.docAnalytics.getMetricWithTrend({ approvalRequests: { some: {} } }),
            this.approvalAnalytics.getMetricWithTrend({ status: ApprovalStatus.PENDING }),
            this.approvalAnalytics.getMetricWithTrend({ status: ApprovalStatus.DECLINED }),
            this.docAnalytics.totalDownloads(),
            this.projectAnalytics.getProjects(3)
        ]);

        // Parallelize all remaining heavy calls for the return object
        const [
            recentGlobalApprovedUploads,
            approvedRequests,
            mostViewed,
            recentApprovedMetric
        ] = await Promise.all([
            this.docAnalytics.recentUploads(6, { approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }),
            this.approvalAnalytics.recentApproved(6),
            this.docAnalytics.mostViewed(6, { approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }),
            this.docAnalytics.getMetricWithTrend({ approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }, true)
        ]);

        const projectsWithStats = await Promise.all(projects.map(async p => {
            const stats = await this.projectAnalytics.getProjectStats(p.id);
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
        }));

        return {
            success: true,
            data: {
                cards: {
                    totalDocuments,
                    pendingApprovals,
                    declinedApprovals,
                    recentUploads: recentApprovedMetric,
                    totalDownloads
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
            totalDocuments,
            pendingApprovals,
            declinedApprovals,
            totalDownloads,
            projects
        ] = await Promise.all([
            this.docAnalytics.getMetricWithTrend({ projectsIDs: { hasSome: projectIds }, approvalRequests: { some: {} } }),
            this.approvalAnalytics.getMetricWithTrend({ projectId: { in: projectIds }, status: ApprovalStatus.PENDING }),
            this.approvalAnalytics.getMetricWithTrend({ projectId: { in: projectIds }, status: ApprovalStatus.DECLINED }),
            this.docAnalytics.totalDownloads({ projectsIDs: { hasSome: projectIds } }),
            this.projectAnalytics.getProjects(3, { id: { in: projectIds } })
        ]);

        const projectsWithStats = await Promise.all(projects.map(async p => {
            const stats = await this.projectAnalytics.getProjectStats(p.id);

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
        }));

        const [
            recentApprovedUploads,
            mostViewed,
            recentApprovedInProjects,
            recentUploadsMetric
        ] = await Promise.all([
            this.docAnalytics.recentUploads(6, {
                projectsIDs: { hasSome: projectIds },
                approvalRequests: { some: { status: ApprovalStatus.APPROVED } }
            }),
            this.docAnalytics.mostViewed(6, {
                projectsIDs: { hasSome: projectIds },
                approvalRequests: { some: { status: ApprovalStatus.APPROVED } }
            }),
            this.approvalAnalytics.recentApproved(6, { projectId: { in: projectIds } }),
            this.docAnalytics.getMetricWithTrend({ projectsIDs: { hasSome: projectIds }, approvalRequests: { some: { status: ApprovalStatus.APPROVED } } }, true)
        ]);

        return {
            success: true,
            data: {
                cards: {
                    totalDocuments,
                    pendingApprovals: pendingApprovals,
                    declinedApprovals: declinedApprovals,
                    recentUploads: recentUploadsMetric,
                    totalDownloads
                },
                projects: projectsWithStats,
                dynamicColumn: {
                    title: "Recently Approved",
                    data: recentApprovedInProjects
                },
                recentUploads: recentApprovedUploads,
                mostViewed
            },
        };
    }

    private async getOperationalStaffStats(user: User) {
        const projectIds = user.projectMemberProjectIDs || [];

        const [
            myTotalDocuments,
            myPendingDocs,
            myDeclinedDocs,
            myApprovedDocs
        ] = await Promise.all([
            this.docAnalytics.getMetricWithTrend({ uploaderId: user.id, approvalRequests: { some: {} } }),
            this.approvalAnalytics.getMetricWithTrend({ submittedById: user.id, status: ApprovalStatus.PENDING }),
            this.approvalAnalytics.getMetricWithTrend({ submittedById: user.id, status: ApprovalStatus.DECLINED }),
            this.approvalAnalytics.getMetricWithTrend({ submittedById: user.id, status: ApprovalStatus.APPROVED })
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

        const projectsWithStats = await Promise.all(projects.map(async p => {
            const stats = await this.projectAnalytics.getProjectStats(p.id);
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
        }));

        return {
            success: true,
            data: {
                cards: {
                    myTotalDocuments: myTotalDocuments,
                    myPendingDocs: myPendingDocs,
                    myDeclinedDocs: myDeclinedDocs,
                    myApprovedDocs: myApprovedDocs,
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
        const totalDocuments = await this.docAnalytics.getMetricWithTrend({ approvalRequests: { some: {} } });
        const activeProjects = await this.projectAnalytics.activeProjects();

        return {
            success: true,
            data: {
                landingCards: {
                    totalDocuments,
                    activeProjects
                }
            }
        };
    }
}