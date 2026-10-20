import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { managerService } from "./manager.service";

const createManager = catchAsync(async (req: Request, res: Response) => {
  const result = await managerService.createManager(
    req.user!.userId,
    req.user!.role,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Manager created and onboarding email sent successfully",
    data: result,
  });
});

const getMyManagerProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await managerService.getMyManagerProfile(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manager profile retrieved successfully",
    data: result,
  });
});

const getAllManagers = catchAsync(async (req: Request, res: Response) => {
  const result = await managerService.getAllManagers(
    req.user!.userId,
    req.user!.role,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Managers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getManagerById = catchAsync(async (req: Request, res: Response) => {
  const managerId = req.params.id as string;
  const result = await managerService.getManagerById(
    managerId,
    req.user!.userId,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manager details retrieved successfully",
    data: result,
  });
});

const updateManager = catchAsync(async (req: Request, res: Response) => {
  const managerId = req.params.id as string;
  const result = await managerService.updateManager(
    managerId,
    req.user!.userId,
    req.user!.role,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manager updated successfully",
    data: result,
  });
});

const deleteManager = catchAsync(async (req: Request, res: Response) => {
  const managerId = req.params.id as string;
  const result = await managerService.deleteManager(
    managerId,
    req.user!.userId,
    req.user!.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manager deleted successfully",
    data: result,
  });
});

export const managerController = {
  createManager,
  getMyManagerProfile,
  getAllManagers,
  getManagerById,
  updateManager,
  deleteManager,
};
