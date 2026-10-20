import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { maintenanceController } from "./maintenance.controller";
import { maintenanceValidation } from "./maintenance.validation";

const router = Router();

router.post(
  "/",
  auth(Role.TENANT),
  upload.single("image"),
  (req, _res, next) => {
    next();
  },
  validateRequest(maintenanceValidation.createMaintenanceZodSchema),
  maintenanceController.createMaintenanceRequest,
);

router.get(
  "/my-requests",
  auth(Role.TENANT),
  maintenanceController.getMyMaintenanceRequests,
);

router.get(
  "/owner-requests",
  auth(Role.OWNER),
  maintenanceController.getOwnerMaintenanceRequests,
);

router.get(
  "/",
  auth(Role.ADMIN),
  maintenanceController.getAllMaintenanceRequests,
);

router.get(
  "/:id",
  auth(Role.TENANT, Role.OWNER, Role.ADMIN, Role.MANAGER),
  maintenanceController.getMaintenanceById,
);

router.patch(
  "/:id/status",
  auth(Role.OWNER, Role.ADMIN, Role.MANAGER),
  validateRequest(maintenanceValidation.updateMaintenanceStatusZodSchema),
  maintenanceController.updateMaintenanceStatus,
);

export const maintenanceRoutes = router;
