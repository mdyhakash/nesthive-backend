import { z } from "zod";
import { RoomType } from "../../../generated/prisma/enums";

const createRoomZodSchema = z.object({
  roomNumber: z
    .string("Not A String!!!!!")
    .min(1, "Room Number is required!!!"),
  roomType: z.enum(
    Object.values(RoomType) as [string, ...string[]],
    "Invalid Room Type!!",
  ),
  rentAmount: z
    .number("Not A Number!!!!!")
    .positive("Rent Amount must be positive!!!"),
  capacity: z
    .number("Not A Number!!!!!")
    .int()
    .positive("Capacity must be positive!!!"),
  availableFrom: z.coerce.date().optional(),
});

const updateRoomZodSchema = z.object({
  roomNumber: z.string().min(1, "Room Number is required!!!").optional(),
  roomType: z
    .enum(
      Object.values(RoomType) as [string, ...string[]],
      "Invalid Room Type!!",
    )
    .optional(),
  rentAmount: z
    .number("Not A Number!!!!!")
    .positive("Rent Amount must be positive!!!")
    .optional(),
  capacity: z
    .number("Not A Number!!!!!")
    .int()
    .positive("Capacity must be positive!!!")
    .optional(),
  availableFrom: z.coerce.date().optional(),
});

export const roomValidation = {
  createRoomZodSchema,
  updateRoomZodSchema,
};
