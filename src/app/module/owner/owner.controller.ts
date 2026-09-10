import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import httpStatus from "http-status";
import { ownerService } from "./owner.service";
import { AppError } from "../../utils/AppError";
import { sendResponse } from "../../utils/sendResponse";

const submitKyc = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "No File Provided.");
  }

  const userId = req.user?.userId as string;

  const result = await ownerService.submitKyc(userId, req.file.buffer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "KYC document submitted. Awaiting admin review.",
    data: result,
  });
});

const getMyOwnerProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  console.log("Authenticated userId:", userId);

  const result = await ownerService.getMyOwnerProfile(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Owner profile retrieved successfully",
    data: result,
  });
});

export const ownerController = {
  submitKyc,
  getMyOwnerProfile,
};
