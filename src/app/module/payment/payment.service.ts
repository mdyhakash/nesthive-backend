import crypto from "crypto";
import httpStatus from "http-status";
import {
  ApplicationStatus,
  BillSplitStatus,
  BillStatus,
  LeaseStatus,
  OccupancyStatus,
  PaymentGateway,
  PaymentStatus,
  PaymentType,
} from "../../../generated/prisma/enums";
import type { IQuery } from "../../../interfaces";
import config from "../../config";
import {
  createBkashPayment,
  executeBkashPayment,
  refundBkashPayment,
} from "../../lib/bkash";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  IConfirmPaymentPayload,
  IInitiateDepositPaymentPayload,
  IInitiateRentPaymentPayload,
  IInitiateUtilityPaymentPayload,
} from "./payment.interface";

const getTenantOrThrow = async (userId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId } });
  if (!tenant)
    throw new AppError(httpStatus.NOT_FOUND, "Tenant profile not found");
  return tenant;
};

const getOwnerOrThrow = async (userId: string) => {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner)
    throw new AppError(httpStatus.NOT_FOUND, "Owner profile not found");
  return owner;
};

// 1. INITIATE DEPOSIT PAYMENT (Security deposit + 1st month rent)
const initiateDepositPayment = async (
  userId: string,
  payload: IInitiateDepositPaymentPayload,
) => {
  const tenant = await getTenantOrThrow(userId);

  const application = await prisma.application.findUnique({
    where: { id: payload.applicationId },
    include: {
      room: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  }

  if (application.tenantId !== tenant.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized for this application",
    );
  }

  if (application.status !== ApplicationStatus.APPROVED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot initiate payment. Application status is currently ${application.status}`,
    );
  }

  // Check if a lease already exists for this application
  const existingLease = await prisma.lease.findUnique({
    where: { applicationId: application.id },
  });

  if (existingLease) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A confirmed lease already exists for this application",
    );
  }

  // Check if room is already at full capacity
  if (application.room.occupantCount >= application.room.capacity) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Room has already reached full capacity",
    );
  }

  // Total Upfront = Security deposit (1 month) + First month rent
  const monthlyRent = Number(application.room.rentAmount);
  const securityDeposit = monthlyRent;
  const totalAmount = monthlyRent + securityDeposit;

  const invoiceNumber = `INV-DEP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const payerReference = payload.payerReference || tenant.contactNumber || "01700000000";

  let bkashPaymentID: string | undefined;
  let bkashURL: string | undefined;
  let bkashResponse: any = null;

  // If bKash credentials exist, create checkout session on bKash Tokenized API
  if (config.bkash_app_key && config.bkash_username) {
    try {
      const bkashRes = await createBkashPayment({
        amount: totalAmount,
        invoiceNumber,
        payerReference,
      });

      bkashPaymentID = bkashRes.paymentID;
      bkashURL = bkashRes.bkashURL;
      bkashResponse = bkashRes;
    } catch (err: any) {
      console.warn("bKash API initiation error:", err?.message);
    }
  }

  const payment = await prisma.payment.create({
    data: {
      type: PaymentType.DEPOSIT,
      status: PaymentStatus.UNPAID,
      amount: totalAmount,
      currency: "BDT",
      paymentGateway: payload.paymentGateway || PaymentGateway.BKASH,
      merchantInvoiceNumber: invoiceNumber,
      payerReference,
      bkashPaymentId: bkashPaymentID,
      gatewayResponse: bkashResponse,
      applicationId: application.id,
      tenantId: tenant.id,
    },
  });

  return {
    paymentId: payment.id,
    merchantInvoiceNumber: payment.merchantInvoiceNumber,
    amount: payment.amount,
    breakdown: {
      firstMonthRent: monthlyRent,
      securityDeposit: securityDeposit,
    },
    paymentGateway: payment.paymentGateway,
    bkashURL,
    bkashPaymentID,
    roomDetails: {
      roomNumber: application.room.roomNumber,
      propertyTitle: application.room.property.title,
      address: application.room.property.address,
    },
  };
};

// 2. ATOMIC DEPOSIT CONFIRMATION HELPER (Used by both direct confirm & bKash execution)
const finalizeDepositPayment = async ({
  payment,
  transactionId,
  gatewayResponse,
}: {
  payment: any;
  transactionId: string;
  gatewayResponse?: any;
}) => {
  const application = await prisma.application.findUnique({
    where: { id: payment.applicationId },
    include: {
      room: {
        include: {
          property: true,
        },
      },
      tenant: true,
    },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  }

  // TRANSACTION-SAFE CONCURRENCY VALIDATION:
  const confirmedData = await prisma.$transaction(async (tx) => {
    // 1. Re-check the room's current occupancy state inside transaction
    const room = await tx.room.findUnique({
      where: { id: application.roomId },
      include: { property: true },
    });

    if (!room) {
      throw new AppError(httpStatus.NOT_FOUND, "Room not found");
    }

    // CONCURRENCY RACE-CONDITION CHECK:
    if (room.occupantCount >= room.capacity) {
      // Auto-refund on bKash if a real bKash payment ID exists
      if (payment.bkashPaymentId && config.bkash_app_key) {
        try {
          await refundBkashPayment({
            paymentID: payment.bkashPaymentId,
            amount: payment.amount,
            trxID: transactionId,
            reason: "Room reached capacity before confirmation finished",
          });
        } catch (err: any) {
          console.error("bKash refund attempt error:", err?.message);
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundTrxId: `REF-${transactionId}`,
          refundAmount: payment.amount,
          refundReason:
            "Room capacity filled by another applicant prior to transaction finalization",
          refundedAt: new Date().toISOString(),
          gatewayResponse: gatewayResponse || undefined,
        },
      });

      await tx.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectionReason:
            "Room filled to capacity. Your payment was automatically refunded.",
        },
      });

      throw new AppError(
        httpStatus.CONFLICT,
        "Another applicant just secured the last open spot in this room. Your payment has been refunded in full.",
      );
    }

    // 2. Room has open capacity -> Confirm payment & activate Lease
    const now = new Date();

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        bkashTrxId: transactionId,
        paidAt: now.toISOString(),
        gatewayResponse: gatewayResponse || undefined,
      },
    });

    // 3. Create active Lease
    const lease = await tx.lease.create({
      data: {
        applicationId: application.id,
        roomId: room.id,
        tenantId: application.tenantId,
        ownerId: room.property.ownerId,
        startDate: now,
        rentAmount: room.rentAmount,
        securityDeposit: room.rentAmount,
        status: LeaseStatus.ACTIVE,
      },
    });

    // 4. Create active RoomOccupant
    await tx.roomOccupant.create({
      data: {
        roomId: room.id,
        tenantId: application.tenantId,
        moveInDate: now,
        status: OccupancyStatus.ACTIVE,
      },
    });

    // 5. Increment room occupant count
    await tx.room.update({
      where: { id: room.id },
      data: {
        occupantCount: {
          increment: 1,
        },
      },
    });

    // 6. Connect lease to payment
    await tx.payment.update({
      where: { id: payment.id },
      data: { leaseId: lease.id },
    });

    return {
      payment: updatedPayment,
      lease,
      room,
      tenant: application.tenant,
    };
  });

  // Dispatch Invoice Receipt Email
  try {
    await transporter.sendMail({
      from: config.email_sender,
      to: confirmedData.tenant.email,
      subject: `NestHive Payment Receipt - ${payment.merchantInvoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Payment Confirmed & Lease Activated 🎉</h2>
          <p>Hi <strong>${confirmedData.tenant.name}</strong>,</p>
          <p>Your payment for room <strong>${confirmedData.room.roomNumber}</strong> at <strong>${confirmedData.room.property.title}</strong> has been successfully processed.</p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
            <p><strong>Invoice Number:</strong> ${payment.merchantInvoiceNumber}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Amount Paid:</strong> ${payment.amount} BDT</p>
            <p><strong>Lease Start Date:</strong> ${new Date(confirmedData.lease.startDate).toLocaleDateString()}</p>
          </div>
          <p style="margin-top: 20px;">Your lease is now active. Welcome to your new home!</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send payment receipt email:", err);
  }

  return confirmedData;
};

// 3. CONFIRM DEPOSIT PAYMENT (Direct / Manual / Simulated)
const confirmDepositPayment = async (
  userId: string,
  payload: IConfirmPaymentPayload,
) => {
  const tenant = await getTenantOrThrow(userId);

  const payment = await prisma.payment.findUnique({
    where: { merchantInvoiceNumber: payload.merchantInvoiceNumber },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
  }

  if (payment.tenantId !== tenant.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized for this payment",
    );
  }

  if (payment.status === PaymentStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This payment has already been confirmed",
    );
  }

  return finalizeDepositPayment({
    payment,
    transactionId: payload.transactionId,
  });
};

// 4. INITIATE MONTHLY RENT PAYMENT
const initiateRentPayment = async (
  userId: string,
  payload: IInitiateRentPaymentPayload,
) => {
  const tenant = await getTenantOrThrow(userId);

  const lease = await prisma.lease.findUnique({
    where: { id: payload.leaseId },
    include: {
      room: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!lease) {
    throw new AppError(httpStatus.NOT_FOUND, "Lease agreement not found");
  }

  if (lease.tenantId !== tenant.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not the tenant on this lease",
    );
  }

  if (lease.status !== LeaseStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot pay rent for a lease that is ${lease.status.toLowerCase()}`,
    );
  }

  const invoiceNumber = `INV-RENT-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const payerReference = payload.payerReference || tenant.contactNumber || "01700000000";

  let bkashPaymentID: string | undefined;
  let bkashURL: string | undefined;
  let bkashResponse: any = null;

  if (config.bkash_app_key && config.bkash_username) {
    try {
      const bkashRes = await createBkashPayment({
        amount: Number(lease.rentAmount),
        invoiceNumber,
        payerReference,
      });

      bkashPaymentID = bkashRes.paymentID;
      bkashURL = bkashRes.bkashURL;
      bkashResponse = bkashRes;
    } catch (err: any) {
      console.warn("bKash rent initiation error:", err?.message);
    }
  }

  const payment = await prisma.payment.create({
    data: {
      type: PaymentType.RENT,
      status: PaymentStatus.UNPAID,
      amount: lease.rentAmount,
      currency: "BDT",
      paymentGateway: payload.paymentGateway || PaymentGateway.BKASH,
      merchantInvoiceNumber: invoiceNumber,
      payerReference,
      bkashPaymentId: bkashPaymentID,
      gatewayResponse: bkashResponse,
      leaseId: lease.id,
      tenantId: tenant.id,
    },
  });

  return {
    paymentId: payment.id,
    merchantInvoiceNumber: payment.merchantInvoiceNumber,
    amount: payment.amount,
    leaseId: lease.id,
    bkashURL,
    bkashPaymentID,
    propertyTitle: lease.room.property.title,
    roomNumber: lease.room.roomNumber,
  };
};

// 5. CONFIRM MONTHLY RENT PAYMENT
const confirmRentPayment = async (
  userId: string,
  payload: IConfirmPaymentPayload,
) => {
  const tenant = await getTenantOrThrow(userId);

  const payment = await prisma.payment.findUnique({
    where: { merchantInvoiceNumber: payload.merchantInvoiceNumber },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
  }

  if (payment.tenantId !== tenant.id) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized payment attempt");
  }

  if (payment.status === PaymentStatus.PAID) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment is already completed");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      bkashTrxId: payload.transactionId,
      paidAt: new Date().toISOString(),
    },
  });

  return updatedPayment;
};

// 6. INITIATE UTILITY BILL SPLIT PAYMENT
const initiateUtilityPayment = async (
  userId: string,
  payload: IInitiateUtilityPaymentPayload,
) => {
  const tenant = await getTenantOrThrow(userId);

  const split = await prisma.utilityBillSplit.findUnique({
    where: { id: payload.utilityBillSplitId },
    include: {
      utilityBill: {
        include: {
          room: true,
        },
      },
    },
  });

  if (!split) {
    throw new AppError(httpStatus.NOT_FOUND, "Utility bill split not found");
  }

  if (split.tenantId !== tenant.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this utility split",
    );
  }

  if (split.status === BillSplitStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This utility bill share has already been paid",
    );
  }

  const invoiceNumber = `INV-UTIL-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const payerReference = payload.payerReference || tenant.contactNumber || "01700000000";

  let bkashPaymentID: string | undefined;
  let bkashURL: string | undefined;
  let bkashResponse: any = null;

  if (config.bkash_app_key && config.bkash_username) {
    try {
      const bkashRes = await createBkashPayment({
        amount: Number(split.shareAmount),
        invoiceNumber,
        payerReference,
      });

      bkashPaymentID = bkashRes.paymentID;
      bkashURL = bkashRes.bkashURL;
      bkashResponse = bkashRes;
    } catch (err: any) {
      console.warn("bKash utility initiation error:", err?.message);
    }
  }

  const payment = await prisma.payment.create({
    data: {
      type: PaymentType.UTILITY,
      status: PaymentStatus.UNPAID,
      amount: split.shareAmount,
      currency: "BDT",
      paymentGateway: payload.paymentGateway || PaymentGateway.BKASH,
      merchantInvoiceNumber: invoiceNumber,
      payerReference,
      bkashPaymentId: bkashPaymentID,
      gatewayResponse: bkashResponse,
      utilityBillSplitId: split.id,
      tenantId: tenant.id,
    },
  });

  return {
    paymentId: payment.id,
    merchantInvoiceNumber: payment.merchantInvoiceNumber,
    amount: payment.amount,
    month: split.utilityBill.month,
    bkashURL,
    bkashPaymentID,
  };
};

// 7. CONFIRM UTILITY BILL SPLIT PAYMENT
const confirmUtilityPayment = async (
  userId: string,
  payload: IConfirmPaymentPayload,
) => {
  const tenant = await getTenantOrThrow(userId);

  const payment = await prisma.payment.findUnique({
    where: { merchantInvoiceNumber: payload.merchantInvoiceNumber },
    include: {
      utilityBillSplit: true,
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
  }

  if (payment.tenantId !== tenant.id) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized payment attempt");
  }

  if (payment.status === PaymentStatus.PAID) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment already completed");
  }

  if (!payment.utilityBillSplitId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Not linked to any utility bill split",
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Mark payment as PAID
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        bkashTrxId: payload.transactionId,
        paidAt: new Date().toISOString(),
      },
    });

    // 2. Mark utility bill split as PAID
    await tx.utilityBillSplit.update({
      where: { id: payment.utilityBillSplitId! },
      data: {
        status: BillSplitStatus.PAID,
        paidAt: new Date(),
      },
    });

    // 3. Check if all splits for the parent bill are settled
    const splitRecord = await tx.utilityBillSplit.findUnique({
      where: { id: payment.utilityBillSplitId! },
    });

    if (splitRecord) {
      const remainingUnpaidSplits = await tx.utilityBillSplit.count({
        where: {
          utilityBillId: splitRecord.utilityBillId,
          status: BillSplitStatus.UNPAID,
        },
      });

      if (remainingUnpaidSplits === 0) {
        await tx.utilityBill.update({
          where: { id: splitRecord.utilityBillId },
          data: { status: BillStatus.SETTLED },
        });
      }
    }

    return updatedPayment;
  });
};

// 8. EXECUTE BKASH CHECKOUT (Called after user enters PIN/OTP in bKash)
const executeBkashCheckout = async (paymentID: string) => {
  const payment = await prisma.payment.findUnique({
    where: { bkashPaymentId: paymentID },
  });

  if (!payment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Payment session not found for this bKash PaymentID",
    );
  }

  if (payment.status === PaymentStatus.PAID) {
    return {
      message: "Payment already completed",
      payment,
    };
  }

  // Execute on bKash API
  const bkashResult = await executeBkashPayment(paymentID);

  if (
    bkashResult.statusCode !== "0000" ||
    bkashResult.transactionStatus !== "Completed"
  ) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: bkashResult,
      },
    });

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      bkashResult.statusMessage || "bKash payment execution was unsuccessful",
    );
  }

  const transactionId = bkashResult.trxID as string;

  if (payment.type === PaymentType.DEPOSIT) {
    return finalizeDepositPayment({
      payment,
      transactionId,
      gatewayResponse: bkashResult,
    });
  }

  if (payment.type === PaymentType.RENT) {
    return prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        bkashTrxId: transactionId,
        paidAt: new Date().toISOString(),
        gatewayResponse: bkashResult,
      },
    });
  }

  if (payment.type === PaymentType.UTILITY) {
    return prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          bkashTrxId: transactionId,
          paidAt: new Date().toISOString(),
          gatewayResponse: bkashResult,
        },
      });

      if (payment.utilityBillSplitId) {
        await tx.utilityBillSplit.update({
          where: { id: payment.utilityBillSplitId },
          data: {
            status: BillSplitStatus.PAID,
            paidAt: new Date(),
          },
        });

        const splitRecord = await tx.utilityBillSplit.findUnique({
          where: { id: payment.utilityBillSplitId },
        });

        if (splitRecord) {
          const remainingUnpaidSplits = await tx.utilityBillSplit.count({
            where: {
              utilityBillId: splitRecord.utilityBillId,
              status: BillSplitStatus.UNPAID,
            },
          });

          if (remainingUnpaidSplits === 0) {
            await tx.utilityBill.update({
              where: { id: splitRecord.utilityBillId },
              data: { status: BillStatus.SETTLED },
            });
          }
        }
      }

      return updatedPayment;
    });
  }

  return { payment, bkashResult };
};

// 9. HANDLE BKASH CALLBACK (Redirect URL handling)
const handleBkashCallback = async (
  paymentID?: string,
  status?: string,
) => {
  if (!paymentID) {
    throw new AppError(httpStatus.BAD_REQUEST, "PaymentID is missing in callback");
  }

  if (status === "cancel" || status === "failure") {
    await prisma.payment.updateMany({
      where: { bkashPaymentId: paymentID },
      data: { status: PaymentStatus.CANCELLED },
    });

    return {
      success: false,
      status: "CANCELLED",
      message: `bKash payment was ${status}`,
    };
  }

  if (status === "success") {
    const executionResult = await executeBkashCheckout(paymentID);
    return {
      success: true,
      status: "COMPLETED",
      data: executionResult,
    };
  }

  throw new AppError(httpStatus.BAD_REQUEST, `Unknown bKash status: ${status}`);
};

// 10. GET MY PAYMENTS (TENANT)
const getMyPayments = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.payment.findMany({
    where: { tenantId: tenant.id },
    include: {
      lease: {
        select: {
          id: true,
          room: { select: { roomNumber: true } },
        },
      },
      utilityBillSplit: {
        select: {
          id: true,
          utilityBill: { select: { month: true, totalAmount: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// 11. GET OWNER PAYMENTS
const getOwnerPayments = async (userId: string) => {
  const owner = await getOwnerOrThrow(userId);

  return prisma.payment.findMany({
    where: {
      lease: {
        ownerId: owner.id,
      },
    },
    include: {
      tenant: {
        select: { name: true, email: true, contactNumber: true },
      },
      lease: {
        select: {
          id: true,
          room: {
            select: {
              roomNumber: true,
              property: { select: { title: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// 12. GET ALL PAYMENTS (ADMIN)
const getAllPayments = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  const payments = await prisma.payment.findMany({
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      tenant: { select: { name: true, email: true } },
      lease: {
        select: {
          room: {
            select: {
              roomNumber: true,
              property: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  const total = await prisma.payment.count();

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const paymentService = {
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
