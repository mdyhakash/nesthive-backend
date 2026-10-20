import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { propertyValidation } from "./property.validation";
import { propertyController } from "./property.controller";

const router = Router();

router.post(
  "/create-property",
  auth(Role.OWNER),
  validateRequest(propertyValidation.createPropertyZodSchema),
  propertyController.createProperty,
);

router.get("/", propertyController.getAllProperties);

router.get(
  "/my-properties",
  auth(Role.OWNER),
  propertyController.getMyProperties,
);

router.get(
  "/assigned/my-properties",
  auth(Role.MANAGER),
  propertyController.getAssignedPropertiesForManager,
);

router.get("/:id", propertyController.getPropertyById);

router.patch(
  "/:id/assign-manager",
  auth(Role.OWNER, Role.ADMIN),
  validateRequest(propertyValidation.assignManagerZodSchema),
  propertyController.assignManager,
);

router.patch(
  "/:id",
  auth(Role.OWNER),
  validateRequest(propertyValidation.updatePropertyZodSchema),
  propertyController.updateProperty,
);

router.patch(
  "/:id/publish",
  auth(Role.OWNER),
  propertyController.publishProperty,
);

router.delete("/:id", auth(Role.OWNER), propertyController.deleteProperty);

export const propertyRoutes = router;
