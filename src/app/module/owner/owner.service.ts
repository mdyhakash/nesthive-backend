import ejs from "ejs";
import httpStatus from "http-status";
import type { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";
import { AppError } from "../../utils/AppError";
import bcrypt from "bcryptjs";
import config from "../../config";
import {
  DocumentType,
  OwnerVerificationStatus,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import { redisClient } from "../../lib/redis";
import path from "path";
import { transporter } from "../../lib/nodemailer";
import crypto from "crypto";
import {
  ILoginOwnerPayload,
  IRegisterOwnerPayload,
  IVerifyOwnerEmailPayload,
} from "./owner.interface";
import { jwtUtils } from "../../utils/jwt";
import { SignOptions } from "jsonwebtoken";

const registerOwner = async (payload: IRegisterOwnerPayload) => {
  const { name, password, owner: ownerData } = payload;

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

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );
  const expirationSeconds = 5 * 60;

  const otpKey = `owner-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });
  const ownerRegistrationKey = `owner-registration-data:${email}`;
  const redisUserDataPayload = {
    name,
    email,
    password: hashedPassword,
    owner: ownerData,
  };

  await redisClient.set(
    ownerRegistrationKey,
    JSON.stringify(redisUserDataPayload),
    {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    },
  );

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/registration-owner-otp.ejs",
  );

  const templateData = {
    name,
    email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Owner Registration - Email Verification",
    html,
  });
};

const verifyOwnerEmail = async (payload: IVerifyOwnerEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const otpKey = `owner-registration-otp:${email}`;

  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP.");
  }

  if (redisOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
  }

  await redisClient.del(otpKey);

  const ownerRegistrationKey = `owner-registration-data:${email}`;

  const redisOwnerData = await redisClient.get(ownerRegistrationKey);

  if (!redisOwnerData) {
    throw new AppError(httpStatus.NOT_FOUND, "Owner Doesnt Exist");
  }

  const ownerPayload: IRegisterOwnerPayload = JSON.parse(redisOwnerData);

  const createdUser = await prisma.user.create({
    data: {
      name: ownerPayload.name,
      email: ownerPayload.email,
      password: ownerPayload.password,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      owner: {
        create: {
          name: ownerPayload.name,
          email: ownerPayload.email,
          contactNumber: ownerPayload?.owner?.contactNumber || "",
        },
      },
    },
    omit: { password: true },
    include: { owner: true },
  });

  await redisClient.del(ownerRegistrationKey);

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/welcome-owner.ejs",
  );

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

  const { owner, ...user } = createdUser;
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
    owner,
    accessToken,
    refreshToken,
  };
};

const loginOwner = async (payload: ILoginOwnerPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "Owner Not Found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "Owner is blocked");
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.FORBIDDEN, "Owner is deleted");
  }

  if (user.password === null && user.googleId !== null) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Owner Already Has Account Registered With Google. Try To Login With Google.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

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
    accessToken,
    refreshToken,
  };
};

const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "auto", folder: "nesthive/owner-kyc" },
        (error, result) => {
          if (error) return reject(error);
          if (!result) {
            return reject(
              new AppError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "No Result Returned From Cloudinary",
              ),
            );
          }
          resolve(result);
        },
      )
      .end(buffer);
  });

const submitKyc = async (
  userId: string,
  kycDocument: Buffer,
  additionalFiles: Buffer[] = [],
) => {
  const owner = await prisma.owner.findUnique({ where: { userId } });

  if (!owner) {
    throw new AppError(httpStatus.NOT_FOUND, "Owner profile not found");
  }

  if (owner.verificationStatus === OwnerVerificationStatus.APPROVED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account is already verified",
    );
  }

  if (
    owner.verificationStatus === OwnerVerificationStatus.PENDING &&
    owner.kycDocumentUrl
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Your KYC is already under review",
    );
  }

  const kycResult = await uploadToCloudinary(kycDocument);

  const additionalResults = await Promise.all(
    additionalFiles.map((buffer) => uploadToCloudinary(buffer)),
  );

  const result = await prisma.$transaction(async (tx) => {
    const updatedOwner = await tx.owner.update({
      where: { id: owner.id },
      data: {
        kycDocumentUrl: kycResult.secure_url,
        kycDocumentPublicId: kycResult.public_id,
        additionalFiles: additionalResults.map((file) => ({
          url: file.secure_url,
          publicId: file.public_id,
        })),
        verificationStatus: "PENDING",
        rejectionReason: null,
      },
    });

    await tx.document.createMany({
      data: [
        {
          type: DocumentType.OWNER_KYC,
          fileUrl: kycResult.secure_url,
          publicId: kycResult.public_id,
          ownerId: owner.id,
        },
        ...additionalResults.map((file) => ({
          type: DocumentType.OWNER_KYC,
          fileUrl: file.secure_url,
          publicId: file.public_id,
          ownerId: owner.id,
        })),
      ],
    });

    return updatedOwner;
  });

  return result;
};

const getMyOwnerProfile = async (userId: string) => {
  const owner = await prisma.owner.findUniqueOrThrow({
    where: { userId: userId },
    include: { properties: true },
  });

  return owner;
};

const getAllOwners = async () => {
  const owners = await prisma.owner.findMany({
    where: { isDeleted: false },
    include: { user: { select: { status: true, emailVerified: true } } },
    orderBy: { createdAt: "desc" },
  });

  return owners;
};

export const ownerService = {
  registerOwner,
  verifyOwnerEmail,
  loginOwner,
  submitKyc,
  getMyOwnerProfile,
  getAllOwners,
};
