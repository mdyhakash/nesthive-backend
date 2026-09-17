import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { tenantService } from "./tenant.service";

const getMyTenantProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await tenantService.getMyTenantProfile(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tenant Profile Retrieved Successfully",
    data: result,
  });
});

const updateMyTenantProfile = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const result = await tenantService.updateMyTenantProfile(
      user.userId,
      req.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Tenant Profile Updated Successfully",
      data: result,
    });
  },
);

const getAllTenants = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await tenantService.getAllTenants(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tenants Retrieved Successfully",
    data,
    meta,
  });
});

const getTenantById = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.params.id as string;
  const result = await tenantService.getTenantById(tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tenant Retrieved Successfully",
    data: result,
  });
});

const deactivateMyAccount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await tenantService.deactivateMyAccount(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account Deactivated Successfully",
    data: result,
  });
});

export const tenantController = {
  getMyTenantProfile,
  updateMyTenantProfile,
  getAllTenants,
  getTenantById,
  deactivateMyAccount,
};
