import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { roommatePreferenceService } from "./roommatePreference.service";

const upsertMyPreference = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await roommatePreferenceService.upsertMyPreference(
    user.userId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roommate Preference Saved Successfully",
    data: result,
  });
});

const getMyPreference = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await roommatePreferenceService.getMyPreference(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roommate Preference Retrieved Successfully",
    data: result,
  });
});

const deleteMyPreference = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  await roommatePreferenceService.deleteMyPreference(user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roommate Preference Removed Successfully",
    data: null,
  });
});

const findMatches = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await roommatePreferenceService.findMatches(
    user.userId,
    limit,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roommate Matches Retrieved Successfully",
    data: result,
  });
});

export const roommatePreferenceController = {
  upsertMyPreference,
  getMyPreference,
  deleteMyPreference,
  findMatches,
};
