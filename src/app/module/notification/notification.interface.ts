import type { NotificationType } from "../../../generated/prisma/enums";

export interface ICreateNotificationPayload {
  userId: string;
  type: NotificationType;
  message: string;
}
