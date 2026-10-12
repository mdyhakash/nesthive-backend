import { z } from "zod";
import { OwnerVerificationStatus, UserStatus } from "../../../generated/prisma/enums";

const updateKycStatusZodSchema = z.object({
  status: z.enum(
    [OwnerVerificationStatus.APPROVED, OwnerVerificationStatus.REJECTED],
    {
      error: "Status must be APPROVED or REJECTED",
    },
  ),
  rejectionReason: z.string().optional(),
});

const updateUserStatusZodSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.DELETED], {
    error: "Status must be ACTIVE, BLOCKED or DELETED",
  }),
});

export const adminValidation = {
  updateKycStatusZodSchema,
  updateUserStatusZodSchema,
};
