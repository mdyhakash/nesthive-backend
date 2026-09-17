import { z } from "zod";

const terminateLeaseZodSchema = z.object({
  terminationReason: z.string().min(3, "Reason is required!!!"),
  moveOutDate: z.coerce.date().optional(),
});

export const leaseValidation = {
  terminateLeaseZodSchema,
};
