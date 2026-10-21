import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type z from "zod";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (zodSchema: z.ZodObject | z.ZodTypeAny) => {
  return catchAsync((req: Request, res: Response, next: NextFunction) => {
    const payload = req.body ?? {};

    const result = zodSchema.safeParse(payload);

    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;

    next();
  });
};

