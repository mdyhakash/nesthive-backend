import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { maintenanceService } from "./maintenance.service";

const createMaintenanceRequest = catchAsync(
  async (req: Request, res: Response) => {
    const file = req.file;
    const result = await maintenanceService.createMaintenanceRequest(
      req.user!.userId,
      req.body,
      file ? file.buffer : undefined,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Maintenance ticket filed successfully",
      data: result,
    });
  },
);

const getMyMaintenanceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await maintenanceService.getMyMaintenanceRequests(
      req.user!.userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My maintenance requests retrieved successfully",
      data: result,
    });
  },
);

const getOwnerMaintenanceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await maintenanceService.getOwnerMaintenanceRequests(
      req.user!.userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Property maintenance tickets retrieved successfully",
      data: result,
    });
  },
);

const getMaintenanceById = catchAsync(async (req: Request, res: Response) => {
  const requestId = req.params.id as string;
  const result = await maintenanceService.getMaintenanceById(
    req.user!.userId,
    req.user!.role,
    requestId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Maintenance request retrieved successfully",
    data: result,
  });
});

const updateMaintenanceStatus = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.id as string;
    const result = await maintenanceService.updateMaintenanceStatus(
      req.user!.userId,
      req.user!.role,
      requestId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Maintenance status updated to ${req.body.status}`,
      data: result,
    });
  },
);

const getAllMaintenanceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await maintenanceService.getAllMaintenanceRequests(
      req.query,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "All maintenance requests retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

export const maintenanceController = {
  createMaintenanceRequest,
  getMyMaintenanceRequests,
  getOwnerMaintenanceRequests,
  getMaintenanceById,
  updateMaintenanceStatus,
  getAllMaintenanceRequests,
};
