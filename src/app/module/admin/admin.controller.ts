import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";

const getPendingKycOwners = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await adminService.getPendingKycOwners();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pending KYC owners retrieved successfully",
      data: result,
    });
  },
);

const updateOwnerKycStatus = catchAsync(
  async (req: Request, res: Response) => {
    const ownerId = req.params.ownerId as string;
    const adminUserId = req.user!.userId;
    const result = await adminService.updateOwnerKycStatus(
      ownerId,
      adminUserId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Owner KYC status updated to ${req.body.status}`,
      data: result,
    });
  },
);

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const currentAdminUserId = req.user!.userId;
  const result = await adminService.updateUserStatus(
    userId,
    currentAdminUserId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status updated to ${req.body.status}`,
    data: result,
  });
});

const getMyAdminProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await adminService.getAdminProfile(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin profile retrieved successfully",
    data: result,
  });
});

const getPlatformOverview = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await adminService.getPlatformOverview();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Platform overview statistics retrieved successfully",
      data: result,
    });
  },
);

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAuditLogs(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Platform audit logs retrieved successfully",
    data: result,
  });
});

export const adminController = {
  getPendingKycOwners,
  updateOwnerKycStatus,
  updateUserStatus,
  getMyAdminProfile,
  getPlatformOverview,
  getAuditLogs,
};
