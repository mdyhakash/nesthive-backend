import { z } from "zod";
import { PaymentGateway } from "../../../generated/prisma/enums";

const initiateDepositPaymentZodSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  paymentGateway: z.nativeEnum(PaymentGateway).optional(),
  payerReference: z.string().optional(),
});

const confirmPaymentZodSchema = z.object({
  merchantInvoiceNumber: z
    .string()
    .min(1, "Merchant invoice number is required"),
  transactionId: z.string().min(1, "Transaction ID is required"),
});

const executeBkashZodSchema = z.object({
  paymentID: z.string().min(1, "bKash Payment ID is required"),
});

const initiateRentPaymentZodSchema = z.object({
  leaseId: z.string().min(1, "Lease ID is required"),
  paymentGateway: z.nativeEnum(PaymentGateway).optional(),
  payerReference: z.string().optional(),
});

const initiateUtilityPaymentZodSchema = z.object({
  utilityBillSplitId: z.string().min(1, "Utility bill split ID is required"),
  paymentGateway: z.nativeEnum(PaymentGateway).optional(),
  payerReference: z.string().optional(),
});

export const paymentValidation = {
  initiateDepositPaymentZodSchema,
  confirmPaymentZodSchema,
  executeBkashZodSchema,
  initiateRentPaymentZodSchema,
  initiateUtilityPaymentZodSchema,
};
