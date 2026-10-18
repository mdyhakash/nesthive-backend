import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { paymentController } from "./payment.controller";
import { paymentValidation } from "./payment.validation";

const router = Router();

// Deposit & Upfront Payment (Securing room & activating lease)
router.post(
  "/initiate-deposit",
  auth(Role.TENANT),
  validateRequest(paymentValidation.initiateDepositPaymentZodSchema),
  paymentController.initiateDepositPayment,
);
router.post(
  "/confirm-deposit",
  auth(Role.TENANT),
  validateRequest(paymentValidation.confirmPaymentZodSchema),
  paymentController.confirmDepositPayment,
);

// Monthly Rent Payments
router.post(
  "/initiate-rent",
  auth(Role.TENANT),
  validateRequest(paymentValidation.initiateRentPaymentZodSchema),
  paymentController.initiateRentPayment,
);
router.post(
  "/confirm-rent",
  auth(Role.TENANT),
  validateRequest(paymentValidation.confirmPaymentZodSchema),
  paymentController.confirmRentPayment,
);

// Utility Bill Split Payments
router.post(
  "/initiate-utility",
  auth(Role.TENANT),
  validateRequest(paymentValidation.initiateUtilityPaymentZodSchema),
  paymentController.initiateUtilityPayment,
);
router.post(
  "/confirm-utility",
  auth(Role.TENANT),
  validateRequest(paymentValidation.confirmPaymentZodSchema),
  paymentController.confirmUtilityPayment,
);

// bKash Direct Webhook & Execution
router.post(
  "/bkash/execute",
  auth(Role.TENANT),
  validateRequest(paymentValidation.executeBkashZodSchema),
  paymentController.executeBkashCheckout,
);
router.get("/bkash/callback", paymentController.handleBkashCallback);

// Queries
router.get("/my-payments", auth(Role.TENANT), paymentController.getMyPayments);
router.get(
  "/owner-payments",
  auth(Role.OWNER),
  paymentController.getOwnerPayments,
);
router.get("/", auth(Role.ADMIN), paymentController.getAllPayments);

export const paymentRoutes = router;
