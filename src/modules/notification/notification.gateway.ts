import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  WsException,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '@prisma/client';
import { NotificationHelperService } from './services/notification-helper.service';
import { NotificationService } from './services/notification.service';
import {
  NOTIFICATION_EVENT,
  NotificationsListEvent,
  NotificationStatusEvent,
} from './events/notification.event';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
  };
}

@WebSocketGateway({
  namespace: '/notification',
  transports: ['websocket'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly helperService: NotificationHelperService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  afterInit(server: Server) {
    server.use(async (client: AuthenticatedSocket, next) => {
      try {
        const token = this.helperService.extractTokenFromSocket(client);
        if (!token) {
          return next(
            new WsException('Authentication error: No token provided'),
          );
        }

        const user = await this.helperService.verifyTokenAndGetUser(token);
        client.user = user;
        next();
      } catch (error) {
        next(new WsException(error.message || 'Authentication error'));
      }
    });
    this.logger.log('WebSocket server initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    if (!client.user) {
      client.disconnect(true);
      return;
    }
    const userId = client.user.id;

    const userRoom = `user_${userId}`;
    await client.join(userRoom);

    const unreadCount = await this.notificationService.getUnreadCount(userId);

    setTimeout(() => {
      client.emit('initial_unread_count', { unread: unreadCount });
    }, 100);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const userRoom = `user_${client.user.id}`;
      await client.leave(userRoom);
    }
  }

  @SubscribeMessage('getAllNotifications')
  async handleGetNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data?: {
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const userId = client.user?.id;
      if (!userId) throw new WsException('Unauthorized');

      await this.notificationService.getAllMemberNotifications(
        userId,
        data?.page,
        data?.limit,
      );
    } catch (error) {
      throw new WsException(
        `Failed to retrieve notifications: ${error.message}`,
      );
    }
  }

  @SubscribeMessage('readAllNotifications')
  async handleMarkAllNotificationsAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.user?.id;
      if (!userId) throw new WsException('Unauthorized');

      const result = await this.notificationService.markAllNotificationAsRead(
        userId,
      );
      client.emit('notificationsRead', result);
    } catch (error) {
      throw new WsException(
        `Failed to mark all notifications as read: ${error.message}`,
      );
    }
  }

  @SubscribeMessage('readOneNotification')
  async handleMarkOneNotificationsAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      notificationId: string;
    },
  ) {
    try {
      const userId = client.user?.id;
      if (!userId) throw new WsException('Unauthorized');

      const result = await this.notificationService.markOneNotificationAsRead(
        userId,
        data.notificationId,
      );
      client.emit('notificationRead', result);
    } catch (error) {
      throw new WsException(
        `Failed to mark notification as read: ${error.message}`,
      );
    }
  }

  sendNotificationToUser(userId: string, notification: Notification): void {
    const userRoom = `user_${userId}`;
    this.server.to(userRoom).emit('new_notification', notification);
    this.updateUnreadCountForUser(userId);
  }

  async updateUnreadCountForUser(userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    this.sendUnreadCountUpdate(userId, count);
  }

  sendUnreadCountUpdate(userId: string, count: number): void {
    const userRoom = `user_${userId}`;
    this.server.to(userRoom).emit('unread_count_update', { unread: count });
  }

  @OnEvent(NOTIFICATION_EVENT.NOTIFICATION_COUNT_UPDATED)
  handleNotificationCountUpdated(payload: NotificationStatusEvent) {
    this.sendUnreadCountUpdate(payload.userId, payload.unReadCCount);
  }

  @OnEvent(NOTIFICATION_EVENT.GET_ALL_NOTIFICATIONS)
  handleGetNotificationsList(payload: NotificationsListEvent) {
    const { list, paginationMeta, userId } = payload;
    const userRoom = `user_${userId}`;
    this.server
      .to(userRoom)
      .emit('notificationsList', { payload: list, paginationMeta });
  }
}
