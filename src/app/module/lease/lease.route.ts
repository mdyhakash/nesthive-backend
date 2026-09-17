import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { leaseController } from "./lease.controller";
import { leaseValidation } from "./lease.validation";

const router = Router();

router.get(
  "/my-leases",
  auth(Role.TENANT),
  leaseController.getMyLeasesAsTenant,
);

router.get(
  "/owner-leases",
  auth(Role.OWNER),
  leaseController.getMyLeasesAsOwner,
);

router.get("/:id", auth(Role.TENANT, Role.OWNER), leaseController.getLeaseById);

router.patch(
  "/:id/terminate",
  auth(Role.TENANT, Role.OWNER),
  validateRequest(leaseValidation.terminateLeaseZodSchema),
  leaseController.terminateLease,
);

router.get("/", auth(Role.ADMIN, Role.MANAGER), leaseController.getAllLeases);

export const leaseRoutes = router;
