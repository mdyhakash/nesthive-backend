import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { utilityBillService } from "./utilityBill.service";

const createUtilityBill = catchAsync(async (req: Request, res: Response) => {
  const result = await utilityBillService.createUtilityBill(
    req.user!.userId,
    req.user!.role,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Utility bill created and split among room occupants successfully",
    data: result,
  });
});

const getMyTenantSplits = catchAsync(async (req: Request, res: Response) => {
  const result = await utilityBillService.getMyTenantSplits(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My utility bill splits retrieved successfully",
    data: result,
  });
});

const getRoomUtilityBills = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const result = await utilityBillService.getRoomUtilityBills(
    req.user!.userId,
    roomId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room utility bills retrieved successfully",
    data: result,
  });
});

const getUtilityBillById = catchAsync(async (req: Request, res: Response) => {
  const billId = req.params.id as string;
  const result = await utilityBillService.getUtilityBillById(billId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Utility bill retrieved successfully",
    data: result,
  });
});

export const utilityBillController = {
  createUtilityBill,
  getMyTenantSplits,
  getRoomUtilityBills,
  getUtilityBillById,
};
