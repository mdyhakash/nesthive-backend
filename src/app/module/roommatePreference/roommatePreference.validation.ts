import { z } from "zod";

const upsertRoommatePreferenceZodSchema = z
  .object({
    budgetMin: z.number("Budget must be a number!!!").positive(),
    budgetMax: z.number("Budget must be a number!!!").positive(),
    preferredArea: z.string().min(2).optional(),
    moveInDate: z.coerce.date().optional(),
    lifestyleTags: z.array(z.string()).max(15).optional(),
    bio: z.string().max(500, "Bio must be under 500 characters!!!").optional(),
  })
  .refine((data) => data.budgetMax >= data.budgetMin, {
    message: "budgetMax must be greater than or equal to budgetMin",
    path: ["budgetMax"],
  });

export const roommatePreferenceValidation = {
  upsertRoommatePreferenceZodSchema,
};
