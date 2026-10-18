import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";

const initiateDepositPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.initiateDepositPayment(
      req.user!.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Deposit payment initiated successfully",
      data: result,
    });
  },
);

const confirmDepositPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.confirmDepositPayment(
      req.user!.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Deposit payment confirmed, lease activated, and occupancy secured",
      data: result,
    });
  },
);

const initiateRentPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.initiateRentPayment(
    req.user!.userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Rent payment initiated successfully",
    data: result,
  });
});

const confirmRentPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.confirmRentPayment(
    req.user!.userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rent payment confirmed successfully",
    data: result,
  });
});

const initiateUtilityPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.initiateUtilityPayment(
      req.user!.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Utility split payment initiated successfully",
      data: result,
    });
  },
);

const confirmUtilityPayment = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.confirmUtilityPayment(
      req.user!.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Utility split payment confirmed successfully",
      data: result,
    });
  },
);

const executeBkashCheckout = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentID } = req.body;
    const result = await paymentService.executeBkashCheckout(paymentID);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "bKash checkout executed and processed successfully",
      data: result,
    });
  },
);

const handleBkashCallback = catchAsync(
  async (req: Request, res: Response) => {
    const paymentID = req.query.paymentID as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await paymentService.handleBkashCallback(
      paymentID,
      status,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: result.success,
      message: result.message || "bKash callback handled successfully",
      data: result.data || null,
    });
  },
);

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getMyPayments(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tenant payments retrieved successfully",
    data: result,
  });
});

const getOwnerPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getOwnerPayments(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Owner payments retrieved successfully",
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getAllPayments(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All platform payments retrieved successfully",
    data: result,
  });
});

export const paymentController = {
  initiateDepositPayment,
  confirmDepositPayment,
  initiateRentPayment,
  confirmRentPayment,
  initiateUtilityPayment,
  confirmUtilityPayment,
  executeBkashCheckout,
  handleBkashCallback,
  getMyPayments,
  getOwnerPayments,
  getAllPayments,
};
