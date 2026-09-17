import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { roommatePreferenceController } from "./roommatePreference.controller";
import { roommatePreferenceValidation } from "./roommatePreference.validation";

const router = Router();

router.put(
  "/me",
  auth(Role.TENANT),
  validateRequest(
    roommatePreferenceValidation.upsertRoommatePreferenceZodSchema,
  ),
  roommatePreferenceController.upsertMyPreference,
);

router.get(
  "/me",
  auth(Role.TENANT),
  roommatePreferenceController.getMyPreference,
);

router.delete(
  "/me",
  auth(Role.TENANT),
  roommatePreferenceController.deleteMyPreference,
);

router.get(
  "/matches",
  auth(Role.TENANT),
  roommatePreferenceController.findMatches,
);

export const roommatePreferenceRoutes = router;
