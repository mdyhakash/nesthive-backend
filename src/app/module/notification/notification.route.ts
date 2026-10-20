import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { notificationController } from "./notification.controller";

const router = Router();

// Get notifications for authenticated user
router.get(
  "/",
  auth(Role.ADMIN, Role.OWNER, Role.TENANT, Role.MANAGER),
  notificationController.getMyNotifications,
);

// Mark all as read
router.patch(
  "/read-all",
  auth(Role.ADMIN, Role.OWNER, Role.TENANT, Role.MANAGER),
  notificationController.markAllAsRead,
);

// Mark single notification as read
router.patch(
  "/:id/read",
  auth(Role.ADMIN, Role.OWNER, Role.TENANT, Role.MANAGER),
  notificationController.markAsRead,
);

export const notificationRoutes = router;
