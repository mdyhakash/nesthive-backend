import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../utils/AppError";
import { redisClient } from "./redis";

export const getBkashIdToken = async () => {
  try {
    const IdTokenKey = "bkash:idToken";
    const RefreshTokenKey = "bkash:refreshToken";

    let bkashIdToken = await redisClient.get(IdTokenKey);
    const bkashIdTokenTTL = await redisClient.ttl(IdTokenKey);

    const bkashRefreshToken = await redisClient.get(RefreshTokenKey);
    const bkashRefreshTokenTTL = await redisClient.ttl(RefreshTokenKey);

    // If id token remaining time is <= 10 minutes or expired, and refresh token exists with > 10 mins
    if (
      (bkashIdTokenTTL <= 600 || !bkashIdToken) &&
      bkashRefreshToken &&
      bkashRefreshTokenTTL > 600
    ) {
      const refreshTokenResponse = await fetch(
        `${config.bkash_base_url}/tokenized/checkout/token/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: config.bkash_username,
            password: config.bkash_password,
          },
          body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret,
            refresh_token: bkashRefreshToken,
          }),
        },
      );

      if (!refreshTokenResponse.ok) {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          "bKash Access Token Grant Failed",
        );
      }

      const bkashRefreshTokenResult = (await refreshTokenResponse.json()) as {
        id_token: string;
      };

      bkashIdToken = bkashRefreshTokenResult.id_token;

      await redisClient.set(IdTokenKey, bkashIdToken, {
        expiration: {
          type: "EX",
          value: 60 * 60,
        },
      });

      return bkashIdToken;
    }

    if (bkashIdToken && bkashIdTokenTTL > 600) {
      return bkashIdToken;
    }

    const response = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/token/grant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: config.bkash_username,
          password: config.bkash_password,
        },
        body: JSON.stringify({
          app_key: config.bkash_app_key,
          app_secret: config.bkash_app_secret,
        }),
      },
    );

    if (!response.ok) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "bKash Access Token Grant Failed",
      );
    }

    const result = (await response.json()) as {
      id_token: string;
      refresh_token: string;
    };

    // Cache id token (1 hour)
    await redisClient.set(IdTokenKey, result.id_token, {
      expiration: {
        type: "EX",
        value: 60 * 60,
      },
    });

    // Cache refresh token (28 days)
    await redisClient.set(RefreshTokenKey, result.refresh_token, {
      expiration: {
        type: "EX",
        value: 60 * 60 * 24 * 28,
      },
    });

    return result.id_token;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      error?.message || "Failed to retrieve bKash token",
    );
  }
};

export const createBkashPayment = async ({
  amount,
  invoiceNumber,
  payerReference = "01700000000",
  callbackUrl = config.bkash_callback_url,
}: {
  amount: number | string;
  invoiceNumber: string;
  payerReference?: string;
  callbackUrl?: string;
}) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: idToken,
        "x-app-key": config.bkash_app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference,
        callbackURL: callbackUrl,
        amount: Number(amount).toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoiceNumber,
      }),
    },
  );

  const data = (await response.json()) as {
    paymentID?: string;
    bkashURL?: string;
    statusCode?: string;
    statusMessage?: string;
    [key: string]: any;
  };

  if (!response.ok || (data.statusCode && data.statusCode !== "0000")) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      data.statusMessage || "Failed to create bKash checkout session",
    );
  }

  return data;
};

export const executeBkashPayment = async (paymentID: string) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: idToken,
        "x-app-key": config.bkash_app_key,
      },
      body: JSON.stringify({ paymentID }),
    },
  );

  const data = (await response.json()) as {
    paymentID?: string;
    trxID?: string;
    transactionStatus?: string;
    amount?: string;
    statusCode?: string;
    statusMessage?: string;
    [key: string]: any;
  };

  if (!response.ok || (data.statusCode && data.statusCode !== "0000")) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      data.statusMessage || "Failed to execute bKash payment",
    );
  }

  return data;
};

export const queryBkashPayment = async (paymentID: string) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/payment/status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: idToken,
        "x-app-key": config.bkash_app_key,
      },
      body: JSON.stringify({ paymentID }),
    },
  );

  return response.json();
};

export const refundBkashPayment = async ({
  paymentID,
  amount,
  trxID,
  sku = "NestHive Housing",
  reason = "Refund issued by NestHive Platform",
}: {
  paymentID: string;
  amount: number | string;
  trxID: string;
  sku?: string;
  reason?: string;
}) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/payment/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: idToken,
        "x-app-key": config.bkash_app_key,
      },
      body: JSON.stringify({
        paymentID,
        amount: Number(amount).toFixed(2),
        trxID,
        sku,
        reason,
      }),
    },
  );

  return response.json();
};
