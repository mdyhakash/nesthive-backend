import { z } from "zod";

const createViewingRequestZodSchema = z.object({
  requestedAt: z.coerce.date("Not A Valid Date!!!!!"),
});

const updateViewingRequestStatusZodSchema = z.object({
  status: z.enum(
    ["APPROVED", "REJECTED"],
    "Status must be APPROVED or REJECTED!!",
  ),
  ownerNote: z.string().max(500).optional(),
});

export const viewingRequestValidation = {
  createViewingRequestZodSchema,
  updateViewingRequestStatusZodSchema,
};
