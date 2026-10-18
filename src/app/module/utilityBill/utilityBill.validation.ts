import { z } from "zod";
import { SplitType } from "../../../generated/prisma/enums";

const createUtilityBillZodSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  month: z.coerce.date({ error: "Valid billing month date is required" }),
  totalAmount: z.number().positive("Total bill amount must be greater than 0"),
  splitType: z.nativeEnum(SplitType).optional(),
  customSplits: z
    .array(
      z.object({
        tenantId: z.string().min(1, "Tenant ID is required"),
        shareAmount: z.number().positive("Share amount must be positive"),
      }),
    )
    .optional(),
});

export const utilityBillValidation = {
  createUtilityBillZodSchema,
};
