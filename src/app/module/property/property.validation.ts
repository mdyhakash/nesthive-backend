import { z } from "zod";
import { PropertyType } from "../../../generated/prisma/enums";

const createPropertyZodSchema = z.object({
  title: z
    .string("Not A String!!!!!")
    .min(3, "Title must atleast 3 characters long!!!")
    .max(100),
  description: z.string().max(1000).optional(),
  address: z.string().min(5, "Address must atleast 5 characters long!!!"),
  city: z.string().min(2, "City must atleast 2 characters long!!!"),
  area: z.string().min(2, "Area must atleast 2 characters long!!!"),
  type: z.enum(
    Object.values(PropertyType) as [string, ...string[]],
    "Invalid Property Type!!",
  ),
  amenities: z.array(z.string()).optional(),
});

const updatePropertyZodSchema = z.object({
  title: z
    .string()
    .min(3, "Title must atleast 3 characters long!!!")
    .max(100)
    .optional(),
  description: z.string().max(1000).optional(),
  address: z
    .string()
    .min(5, "Address must atleast 5 characters long!!!")
    .optional(),
  city: z.string().min(2, "City must atleast 2 characters long!!!").optional(),
  area: z.string().min(2, "Area must atleast 2 characters long!!!").optional(),
  type: z
    .enum(
      Object.values(PropertyType) as [string, ...string[]],
      "Invalid Property Type!!",
    )
    .optional(),
  amenities: z.array(z.string()).optional(),
});

export const propertyValidation = {
  createPropertyZodSchema,
  updatePropertyZodSchema,
};
