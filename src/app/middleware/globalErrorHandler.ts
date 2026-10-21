import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";
import { AppError } from "../utils/AppError";

type TErrorSource = {
  path: string | number;
  message: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const globalErrorHandler = async (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (config.node_env === "development") {
    console.log("Error from Global Error Handler:", err);
  }

  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || "Something went wrong";
  let errors: TErrorSource[] = [];

  if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation Error";
    errors = err.issues.map((issue) => ({
      path: issue.path.join(".") || "field",
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = [{ path: "", message: err.message }];
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "You have provided incorrect field type or missing fields";
    errors = [{ path: "", message: "Database validation error" }];
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = httpStatus.BAD_REQUEST;
    if (err.code === "P2002") {
      message = "Duplicate Key Error: Record already exists";
      const target = (err.meta?.target as string[])?.join(", ") || "";
      errors = [{ path: target, message: "Field already exists" }];
    } else if (err.code === "P2003") {
      message = "Foreign key constraint failed";
      errors = [{ path: "", message: "Referenced record does not exist" }];
    } else if (err.code === "P2025") {
      message = "An operation failed because required record was not found.";
      errors = [{ path: "", message: "Target record not found" }];
    } else {
      message = err.message;
      errors = [{ path: "", message: err.message }];
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Database connection error";
    errors = [{ path: "", message: err.message }];
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = "Error occurred during query execution";
    errors = [{ path: "", message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errors = [{ path: "", message: err.message }];
  } else {
    errors = [{ path: "", message: "Unknown error occurred" }];
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    stack: config.node_env === "development" ? err.stack : undefined,
  });
};
