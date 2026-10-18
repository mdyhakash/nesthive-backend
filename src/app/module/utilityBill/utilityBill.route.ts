import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { utilityBillController } from "./utilityBill.controller";
import { utilityBillValidation } from "./utilityBill.validation";

const router = Router();

// Create utility bill for room (Owner or active Tenant)
router.post(
  "/",
  auth(Role.OWNER, Role.TENANT),
  validateRequest(utilityBillValidation.createUtilityBillZodSchema),
  utilityBillController.createUtilityBill,
);

// Get tenant's personal assigned splits
router.get(
  "/my-splits",
  auth(Role.TENANT),
  utilityBillController.getMyTenantSplits,
);

// Get bills for a specific room (Owner)
router.get(
  "/room/:roomId",
  auth(Role.OWNER),
  utilityBillController.getRoomUtilityBills,
);

// Get single utility bill details
router.get(
  "/:id",
  auth(Role.OWNER, Role.TENANT, Role.ADMIN),
  utilityBillController.getUtilityBillById,
);

export const utilityBillRoutes = router;
