import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ApplicationService } from "./application.service";

const createApplication = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApplicationService.createApplication(user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Application Submitted Successfully",
    data: result,
  });
});

const getMyApplications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApplicationService.getMyApplications(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Applications Retrieved Successfully",
    data: result,
  });
});

const getApplicationsForRoom = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const roomId = req.params.roomId as string;
  const result = await ApplicationService.getApplicationsForRoom(user.userId, roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room Applications Retrieved Successfully",
    data: result,
  });
});

const getApplicationById = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const applicationId = req.params.id as string;
  const result = await ApplicationService.getApplicationById(user.userId, applicationId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application Retrieved Successfully",
    data: result,
  });
});

const updateApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const applicationId = req.params.id as string;
  const result = await ApplicationService.updateApplicationStatus(
    user.userId,
    applicationId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application Status Updated Successfully",
    data: result,
  });
});

const withdrawApplication = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const applicationId = req.params.id as string;
  const result = await ApplicationService.withdrawApplication(user.userId, applicationId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application Withdrawn Successfully",
    data: result,
  });
});

export const applicationController = {
  createApplication,
  getMyApplications,
  getApplicationsForRoom,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
};