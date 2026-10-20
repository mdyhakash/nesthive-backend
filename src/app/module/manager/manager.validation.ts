import { z } from "zod";

const createManagerZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Valid email address is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .optional(),
});

const updateManagerZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").optional(),
});

export const managerValidation = {
  createManagerZodSchema,
  updateManagerZodSchema,
};
