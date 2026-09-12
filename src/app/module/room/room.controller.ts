import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { roomService } from "./room.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const createRoom = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const propertyId = req.params.propertyId as string;

  const result = await roomService.createRoom(user.userId, propertyId, payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room Created Successfully",
    data: result,
  });
});

const getAllRooms = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await roomService.getAllRooms(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rooms Retrieved Successfully",
    data,
    meta,
  });
});

const getRoomsByProperty = catchAsync(async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId as string;

  const result = await roomService.getRoomsByProperty(propertyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property Rooms Retrieved Successfully",
    data: result,
  });
});

const getRoomById = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params.id as string;

  const result = await roomService.getRoomById(roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room Retrieved Successfully",
    data: result,
  });
});

const getMyRooms = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const propertyId = req.params.propertyId as string;

  const result = await roomService.getMyRooms(user.userId, propertyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Rooms Retrieved Successfully",
    data: result,
  });
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const roomId = req.params.id as string;

  const result = await roomService.updateRoom(user.userId, roomId, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room Updated Successfully",
    data: result,
  });
});

const publishRoom = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const roomId = req.params.id as string;

  const result = await roomService.publishRoom(user.userId, roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room Published Successfully",
    data: result,
  });
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const roomId = req.params.id as string;

  const result = await roomService.deleteRoom(user.userId, roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room Deleted Successfully",
    data: result,
  });
});

export const roomController = {
  createRoom,
  getAllRooms,
  getRoomsByProperty,
  getRoomById,
  getMyRooms,
  updateRoom,
  publishRoom,
  deleteRoom,
};
