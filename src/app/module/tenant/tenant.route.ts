import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { tenantController } from "./tenant.controller";
import { tenantValidation } from "./tenant.validation";

const router = Router();

router.get("/me", auth(Role.TENANT), tenantController.getMyTenantProfile);

router.patch(
  "/me",
  auth(Role.TENANT),
  validateRequest(tenantValidation.updateTenantProfileZodSchema),
  tenantController.updateMyTenantProfile,
);

router.delete("/me", auth(Role.TENANT), tenantController.deactivateMyAccount);

router.get("/", auth(Role.ADMIN, Role.MANAGER), tenantController.getAllTenants);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.MANAGER, Role.OWNER),
  tenantController.getTenantById,
);

export const tenantRoutes = router;
