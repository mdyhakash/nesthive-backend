import type { PaymentGateway } from "../../../generated/prisma/enums";

export interface IInitiateDepositPaymentPayload {
  applicationId: string;
  paymentGateway?: PaymentGateway;
  payerReference?: string;
}

export interface IConfirmPaymentPayload {
  merchantInvoiceNumber: string;
  transactionId: string;
}

export interface IExecuteBkashPayload {
  paymentID: string;
}

export interface IInitiateRentPaymentPayload {
  leaseId: string;
  paymentGateway?: PaymentGateway;
  payerReference?: string;
}

export interface IInitiateUtilityPaymentPayload {
  utilityBillSplitId: string;
  paymentGateway?: PaymentGateway;
  payerReference?: string;
}
