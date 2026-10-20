import httpStatus from "http-status";
import type { NotificationType } from "../../../generated/prisma/enums";
import type { IQuery } from "../../../interfaces";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getMyNotifications = async (userId: string, query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 20;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    data: notifications,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  };
};

const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized for this notification",
    );
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
    },
  });
};

export const notificationService = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};
