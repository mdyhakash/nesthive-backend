import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { applicationController } from "./application.controller";
import { applicationValidation } from "./application.validation";

const router = Router();

router.post(
  "/",
  auth(Role.TENANT),
  validateRequest(applicationValidation.createApplicationZodSchema),
  applicationController.createApplication,
);

router.get("/my-applications", auth(Role.TENANT), applicationController.getMyApplications);

router.get(
  "/room/:roomId",
  auth(Role.OWNER),
  applicationController.getApplicationsForRoom,
);

router.get("/:id", auth(Role.TENANT, Role.OWNER), applicationController.getApplicationById);

router.patch(
  "/:id/status",
  auth(Role.OWNER),
  validateRequest(applicationValidation.updateApplicationStatusZodSchema),
  applicationController.updateApplicationStatus,
);

router.patch("/:id/withdraw", auth(Role.TENANT), applicationController.withdrawApplication);

export const applicationRoutes = router;