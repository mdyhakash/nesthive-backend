import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { ownerController } from "./owner.controller";

const router = Router();

router.post(
  "/kyc",
  auth(Role.OWNER),
  upload.single("document"),
  ownerController.submitKyc,
);

router.get("/me", auth(Role.OWNER), ownerController.getMyOwnerProfile);

router.get("/", auth(Role.ADMIN, Role.MANAGER), ownerController.getAllOwners);

export const ownerRoutes = router;
