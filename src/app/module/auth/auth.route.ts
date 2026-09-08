import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authValidation } from "./auth.validation";
import { authController } from "./auth.controller";

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

export const authRoutes = router;
