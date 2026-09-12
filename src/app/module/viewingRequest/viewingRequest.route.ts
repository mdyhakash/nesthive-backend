import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { viewingRequestController } from "./viewingRequest.controller";
import { viewingRequestValidation } from "./viewingRequest.validation";

const router = Router();

router.post(
  "/room/:roomId",
  auth(Role.TENANT),
  validateRequest(viewingRequestValidation.createViewingRequestZodSchema),
  viewingRequestController.createViewingRequest,
);

router.get(
  "/my-requests",
  auth(Role.TENANT),
  viewingRequestController.getMyViewingRequests,
);

router.get(
  "/room/:roomId",
  auth(Role.OWNER),
  viewingRequestController.getViewingRequestsForRoom,
);

router.get(
  "/:id",
  auth(Role.OWNER, Role.TENANT),
  viewingRequestController.getViewingRequestById,
);

router.patch(
  "/:id/status",
  auth(Role.OWNER),
  validateRequest(viewingRequestValidation.updateViewingRequestStatusZodSchema),
  viewingRequestController.updateViewingRequestStatus,
);

router.patch(
  "/:id/cancel",
  auth(Role.TENANT),
  viewingRequestController.cancelViewingRequest,
);

export const viewingRequestRoutes = router;
