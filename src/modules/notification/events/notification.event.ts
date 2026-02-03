export const NOTIFICATION_EVENT = {
    NOTIFICATION_COUNT_UPDATED: 'notification.count_updated',
    GET_ALL_NOTIFICATIONS: 'notification.get_all',
};

export class NotificationStatusEvent {
    constructor(
        public readonly userId: string,
        public readonly unReadCCount: number,
    ) { }
}

export class NotificationsListEvent {
    constructor(
        public readonly userId: string,
        public readonly list: any[],
        public readonly paginationMeta: any,
    ) { }
}
