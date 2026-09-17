import { z } from "zod";
import { Gender } from "../../../generated/prisma/enums";

const updateTenantProfileZodSchema = z.object({
  name: z.string().min(3, "Name must atleast 3 characters long!!!").optional(),
  contactNumber: z.string().min(6, "Invalid contact number!!!").optional(),
  address: z.string().min(3, "Address is too short!!!").optional(),
  gender: z
    .enum(Object.values(Gender) as [string, ...string[]], "Invalid Gender!!")
    .optional(),
  nidNumber: z.string().min(5, "Invalid NID number!!!").optional(),
});

export const tenantValidation = {
  updateTenantProfileZodSchema,
};
