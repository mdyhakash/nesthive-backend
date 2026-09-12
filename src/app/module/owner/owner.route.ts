import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { ownerController } from "./owner.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ownerValidation } from "./owner.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(ownerValidation.registerOwnerZodSchema),
  ownerController.registerOwner,
);
router.post(
  "/verify-email",
  validateRequest(ownerValidation.ownerEmailVerifyZodSchema),
  ownerController.verifyOwnerEmail,
);

router.post(
  "/login",
  validateRequest(ownerValidation.loginZodSchema),
  ownerController.loginUser,
);

router.post(
  "/kyc",
  auth(Role.OWNER),
  upload.fields([
    { name: "kycDocument", maxCount: 1 },
    { name: "additionalFiles", maxCount: 5 },
  ]),
  ownerController.submitKyc,
);

router.get("/me", auth(Role.OWNER), ownerController.getMyOwnerProfile);

router.get("/", auth(Role.ADMIN, Role.MANAGER), ownerController.getAllOwners);

export const ownerRoutes = router;
