import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { propertyService } from "./property.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await propertyService.createProperty(user.userId, payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Property Created Successfully",
    data: result,
  });
});

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await propertyService.getAllProperties(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Properties Retrieved Successfully",
    data,
    meta,
  });
});

const getPropertyById = catchAsync(async (req: Request, res: Response) => {
  const propertyId = req.params.id as string;

  const result = await propertyService.getPropertyById(propertyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property Retrieved Successfully",
    data: result,
  });
});

const getMyProperties = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  const result = await propertyService.getMyProperties(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Properties Retrieved Successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const propertyId = req.params.id as string;

  const result = await propertyService.updateProperty(
    user.userId,
    propertyId,
    payload,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property Updated Successfully",
    data: result,
  });
});

const publishProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const propertyId = req.params.id as string;

  const result = await propertyService.publishProperty(user.userId, propertyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property Published Successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const propertyId = req.params.id as string;

  const result = await propertyService.deleteProperty(user.userId, propertyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property Deleted Successfully",
    data: result,
  });
});

export const propertyController = {
  createProperty,
  getAllProperties,
  getPropertyById,
  getMyProperties,
  updateProperty,
  publishProperty,
  deleteProperty,
};
