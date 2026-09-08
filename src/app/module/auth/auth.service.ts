import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import crypto from "crypto";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { IRegisterTenantPayload, IVerifyEmailPayload } from "./auth.interface";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import path from "path";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";
import { SignOptions } from "jsonwebtoken";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs";

const registerTenant = async (payload: IRegisterTenantPayload) => {
  const { name, password, tenant: tenantData } = payload;

  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const expirationSeconds = 5 * 60;

  const otpKey = `tenant-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const tenantRegistrationKey = `tenant-registration-data:${email}`;
  const redisUserDataPayload = {
    name,
    email,
    password: hashedPassword,
    tenant: tenantData,
  };

  await redisClient.set(
    tenantRegistrationKey,
    JSON.stringify(redisUserDataPayload),
    {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    },
  );

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/emailverify.ejs",
  );

  const templateData = {
    name,
    email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Email Verification",
    html,
  });
};

const verifyTenantEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist?.status === "BLOCKED") {
    throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
  }

  if (isUserExist?.emailVerified) {
    throw new AppError(httpStatus.CONFLICT, "Email ALready Verified");
  }

  if (isUserExist?.isDeleted || isUserExist?.status === "DELETED") {
    throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
  }

  const otpKey = `tenant-registration-otp:${email}`;

  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  if (redisOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
  }

  await redisClient.del(otpKey);

  const tenantRegistrationKey = `tenant-registration-data:${email}`;

  const redisTenantData = await redisClient.get(tenantRegistrationKey);

  if (!redisTenantData) {
    throw new AppError(httpStatus.NOT_FOUND, "Tenant Doesnt Exist");
  }

  const tenantPayload: IRegisterTenantPayload = JSON.parse(redisTenantData);

  const createdUser = await prisma.user.create({
    data: {
      name: tenantPayload.name,
      email: tenantPayload.email,
      password: tenantPayload.password,
      role: Role.TENANT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      tenant: {
        create: {
          name: tenantPayload.name,
          email: tenantPayload.email,
          contactNumber: tenantPayload?.tenant?.contactNumber || "",
        },
      },
    },
    omit: { password: true },
    include: { tenant: true },
  });

  await redisClient.del(tenantRegistrationKey);

  const tempatePath = path.join(process.cwd(), "src/app/templates/welcome.ejs");

  const templateData = {
    name: createdUser.name,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Welcome To NestHive",
    html,
  });

  const { tenant, ...user } = createdUser;
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    user,
    tenant,
    accessToken,
    refreshToken,
  };
};

export const authService = {
  registerTenant,
  verifyTenantEmail,
};
