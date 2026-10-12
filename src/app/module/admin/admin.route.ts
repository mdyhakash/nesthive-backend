import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";

const router = Router();

router.get("/overview", auth(Role.ADMIN), adminController.getPlatformOverview);

router.get("/me", auth(Role.ADMIN), adminController.getMyAdminProfile);

router.get("/audit-logs", auth(Role.ADMIN), adminController.getAuditLogs);

router.get(
  "/kyc/pending",
  auth(Role.ADMIN),
  adminController.getPendingKycOwners,
);
router.patch(
  "/kyc/:ownerId",
  auth(Role.ADMIN),
  validateRequest(adminValidation.updateKycStatusZodSchema),
  adminController.updateOwnerKycStatus,
);

router.patch(
  "/user/:userId/status",
  auth(Role.ADMIN),
  validateRequest(adminValidation.updateUserStatusZodSchema),
  adminController.updateUserStatus,
);

export const adminRoutes = router;
