import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import httpStatus from "http-status";
import { ownerService } from "./owner.service";
import { AppError } from "../../utils/AppError";
import { sendResponse } from "../../utils/sendResponse";

const registerOwner = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  await ownerService.registerOwner(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Verification OTP Sent",
    data: null,
  });
});

const verifyOwnerEmail = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await ownerService.verifyOwnerEmail(payload);

  const { accessToken, refreshToken, user, owner } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Email Verified Successfully",
    data: {
      accessToken,
      refreshToken,
      user,
      owner,
    },
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await ownerService.loginOwner(payload);

  const { accessToken, refreshToken } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Owner logged in successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
});

const submitKyc = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const kycDocument = files?.["kycDocument"] ? files["kycDocument"][0] : null;
  const additionalFiles = files?.["additionalFiles"] || [];

  if (!kycDocument) {
    throw new AppError(httpStatus.BAD_REQUEST, "KYC Document Is Required");
  }

  const result = await ownerService.submitKyc(
    req.user!.userId,
    kycDocument.buffer,
    additionalFiles.map((file) => file.buffer),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "KYC Submitted Successfully. Awaiting admin review.",
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

const getAllOwners = catchAsync(async (req: Request, res: Response) => {
  const result = await ownerService.getAllOwners();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Owners retrieved successfully",
    data: result,
  });
});

export const ownerController = {
  registerOwner,
  verifyOwnerEmail,
  loginUser,
  submitKyc,
  getMyOwnerProfile,
  getAllOwners,
};
