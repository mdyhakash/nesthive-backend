import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authValidation } from "./auth.validation";
import { authController } from "./auth.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/register",
  validateRequest(authValidation.registerTenantZodSchema),
  authController.registerTenant,
);
router.post(
  "/verify-email",
  validateRequest(authValidation.tenantEmailVerifyZodSchema),
  authController.verifyTenantEmail,
);
router.post(
  "/login",
  validateRequest(authValidation.loginZodSchema),
  authController.loginUser,
);
router.get(
  "/me",
  auth(Role.ADMIN, Role.MANAGER, Role.OWNER, Role.TENANT),
  authController.getMe,
);
router.get("/refresh-token", authController.refreshToken);

router.post(
  "/forgot-password",
  validateRequest(authValidation.forgotPasswordZodSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordZodSchema),
  authController.resetPassword,
);

export const authRoutes = router;
