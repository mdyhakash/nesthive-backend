import { z } from "zod";

const createApplicationZodSchema = z.object({
  roomId: z.string("Not A String!!!!!").min(1, "Room ID is required!!!"),
});

const updateApplicationStatusZodSchema = z.object({
  status: z.enum(
    ["APPROVED", "REJECTED"],
    "Status must be APPROVED or REJECTED",
  ),
  rejectionReason: z.string().optional(),
  paymentDeadline: z.coerce.date().optional(),
});

export const applicationValidation = {
  createApplicationZodSchema,
  updateApplicationStatusZodSchema,
};
