import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { viewingRequestService } from "./viewingRequest.service";

const createViewingRequest = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const roomId = req.params.roomId as string;

  const result = await viewingRequestService.createViewingRequest(
    user.userId,
    roomId,
    payload,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Viewing Request Created Successfully",
    data: result,
  });
});

const getMyViewingRequests = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  const result = await viewingRequestService.getMyViewingRequests(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Viewing Requests Retrieved Successfully",
    data: result,
  });
});

const getViewingRequestsForRoom = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const roomId = req.params.roomId as string;

    const result = await viewingRequestService.getViewingRequestsForRoom(
      user.userId,
      roomId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Room Viewing Requests Retrieved Successfully",
      data: result,
    });
  },
);

const getViewingRequestById = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const result = await viewingRequestService.getViewingRequestById(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Viewing Request Retrieved Successfully",
      data: result,
    });
  },
);

const updateViewingRequestStatus = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const user = req.user!;
    const id = req.params.id as string;

    const result = await viewingRequestService.updateViewingRequestStatus(
      user.userId,
      id,
      payload,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Viewing Request Status Updated Successfully",
      data: result,
    });
  },
);

const cancelViewingRequest = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const id = req.params.id as string;

  const result = await viewingRequestService.cancelViewingRequest(
    user.userId,
    id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Viewing Request Cancelled Successfully",
    data: result,
  });
});

export const viewingRequestController = {
  createViewingRequest,
  getMyViewingRequests,
  getViewingRequestsForRoom,
  getViewingRequestById,
  updateViewingRequestStatus,
  cancelViewingRequest,
};
