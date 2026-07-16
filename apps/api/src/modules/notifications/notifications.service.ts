import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../common/utils/helpers.util';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    const unreadCount = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { ...buildPaginatedResponse(data, total, page, limit), unreadCount };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(id: string, userId: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: { userId, type: type as any, title, body, data },
    });
  }

  async sendOrderNotification(userId: string, orderId: string, status: string) {
    const messages: Record<string, { title: string; body: string }> = {
      CONFIRMED: { title: 'Order Confirmed! 🎉', body: 'Your order has been confirmed and is being processed.' },
      PACKED: { title: 'Order Packed 📦', body: 'Your order has been packed and will be shipped soon.' },
      SHIPPED: { title: 'Order Shipped 🚚', body: 'Your order is on the way!' },
      OUT_FOR_DELIVERY: { title: 'Out for Delivery! 🏠', body: 'Your order will be delivered today.' },
      DELIVERED: { title: 'Order Delivered ✅', body: 'Your order has been delivered. Enjoy!' },
      CANCELLED: { title: 'Order Cancelled', body: 'Your order has been cancelled.' },
      REFUNDED: { title: 'Refund Processed 💰', body: 'Your refund has been processed.' },
    };

    const msg = messages[status];
    if (msg) {
      await this.createNotification(userId, 'ORDER_UPDATE', msg.title, msg.body, { orderId });
      // TODO: Send FCM push notification via firebase-admin
    }
  }
}
