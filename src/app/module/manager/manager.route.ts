import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { managerController } from "./manager.controller";
import { managerValidation } from "./manager.validation";

const router = Router();

// Create new manager (Admin or Owner only - Manager CANNOT create a manager)
router.post(
  "/",
  auth(Role.ADMIN, Role.OWNER),
  validateRequest(managerValidation.createManagerZodSchema),
  managerController.createManager,
);

// Manager views own profile & assigned tasks
router.get("/me", auth(Role.MANAGER), managerController.getMyManagerProfile);

// List managers (Admin sees all, Owner sees managers they created)
router.get("/", auth(Role.ADMIN, Role.OWNER), managerController.getAllManagers);

// Get single manager details
router.get(
  "/:id",
  auth(Role.ADMIN, Role.OWNER),
  managerController.getManagerById,
);

// Update manager info
router.patch(
  "/:id",
  auth(Role.ADMIN, Role.OWNER),
  validateRequest(managerValidation.updateManagerZodSchema),
  managerController.updateManager,
);

// Deactivate / Delete manager
router.delete(
  "/:id",
  auth(Role.ADMIN, Role.OWNER),
  managerController.deleteManager,
);

export const managerRoutes = router;
