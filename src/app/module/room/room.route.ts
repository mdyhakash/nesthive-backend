import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { roomValidation } from "./room.validation";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { roomController } from "./room.controller";

const router = Router();

router.post(
  "/create-room/:propertyId",
  auth(Role.OWNER),
  validateRequest(roomValidation.createRoomZodSchema),
  roomController.createRoom,
);

router.get("/", roomController.getAllRooms);

router.get("/property/:propertyId", roomController.getRoomsByProperty);

router.get(
  "/:propertyId/my-rooms",
  auth(Role.OWNER),
  roomController.getMyRooms,
);

router.get("/:id", roomController.getRoomById);

router.patch(
  "/:id",
  auth(Role.OWNER),
  validateRequest(roomValidation.updateRoomZodSchema),
  roomController.updateRoom,
);

router.patch("/:id/publish", auth(Role.OWNER), roomController.publishRoom);

router.delete("/:id", auth(Role.OWNER), roomController.deleteRoom);

export const roomRoutes = router;
