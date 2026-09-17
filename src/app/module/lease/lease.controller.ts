import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { leaseService } from "./lease.service";

const getMyLeasesAsTenant = catchAsync(async (req: Request, res: Response) => {
  const result = await leaseService.getMyLeasesAsTenant(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Leases Retrieved Successfully",
    data: result,
  });
});

const getMyLeasesAsOwner = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await leaseService.getMyLeasesAsOwner(
    req.user!.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Property Leases Retrieved Successfully",
    data,
    meta,
  });
});

const getLeaseById = catchAsync(async (req: Request, res: Response) => {
  const result = await leaseService.getLeaseById(
    req.user!.userId,
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease Retrieved Successfully",
    data: result,
  });
});

const terminateLease = catchAsync(async (req: Request, res: Response) => {
  const result = await leaseService.terminateLease(
    req.user!.userId,
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease Terminated Successfully",
    data: result,
  });
});

const getAllLeases = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await leaseService.getAllLeases(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Leases Retrieved Successfully",
    data,
    meta,
  });
});

export const leaseController = {
  getMyLeasesAsTenant,
  getMyLeasesAsOwner,
  getLeaseById,
  terminateLease,
  getAllLeases,
};
