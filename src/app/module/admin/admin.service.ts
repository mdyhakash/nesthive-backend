import path from "path";
import ejs from "ejs";
import httpStatus from "http-status";
import {
  OwnerVerificationStatus,
  Role,
} from "../../../generated/prisma/enums";
import type { IQuery } from "../../../interfaces";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  IUpdateKycStatusPayload,
  IUpdateUserStatusPayload,
} from "./admin.interface";

const getPendingKycOwners = async () => {
  return prisma.owner.findMany({
    where: {
      verificationStatus: OwnerVerificationStatus.PENDING,
      isDeleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
          status: true,
        },
      },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const updateOwnerKycStatus = async (
  ownerId: string,
  adminUserId: string,
  payload: IUpdateKycStatusPayload,
) => {
  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    include: { user: true },
  });

  if (!owner) {
    throw new AppError(httpStatus.NOT_FOUND, "Owner not found");
  }

  if (
    payload.status === OwnerVerificationStatus.APPROVED &&
    owner.verificationStatus === OwnerVerificationStatus.APPROVED
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, "Owner is already approved");
  }

  if (
    payload.status === OwnerVerificationStatus.REJECTED &&
    owner.verificationStatus === OwnerVerificationStatus.REJECTED
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, "Owner KYC is already rejected");
  }

  const updatedOwner = await prisma.owner.update({
    where: { id: ownerId },
    data: {
      verificationStatus: payload.status,
      rejectionReason:
        payload.status === OwnerVerificationStatus.REJECTED
          ? payload.rejectionReason || "Verification criteria not met"
          : null,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    },
  });

  // Record Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: `KYC_${payload.status}`,
        entityType: "OWNER",
        entityId: ownerId,
        meta: {
          status: payload.status,
          rejectionReason: payload.rejectionReason || null,
        },
      },
    });
  } catch (err) {
    console.warn("Audit log creation error:", err);
  }

  // Send KYC Status Notification Email
  try {
    const dashboardUrl = `${config.frontend_url || "http://localhost:3000"}/owner/dashboard`;

    if (payload.status === OwnerVerificationStatus.APPROVED) {
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/kyc-approved.ejs",
      );
      const html = await ejs.renderFile(templatePath, {
        name: owner.name,
        dashboardUrl,
      });

      await transporter.sendMail({
        from: `"NestHive" <${config.email_sender}>`,
        to: owner.email,
        subject: "Congratulations! Your NestHive Owner KYC is Approved 🎉",
        html,
      });
    } else if (payload.status === OwnerVerificationStatus.REJECTED) {
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/kyc-rejected.ejs",
      );
      const html = await ejs.renderFile(templatePath, {
        name: owner.name,
        rejectionReason:
          payload.rejectionReason || "Submitted KYC documents could not be verified.",
        dashboardUrl: `${config.frontend_url || "http://localhost:3000"}/owner/kyc`,
      });

      await transporter.sendMail({
        from: `"NestHive" <${config.email_sender}>`,
        to: owner.email,
        subject: "Important: NestHive KYC Verification Update",
        html,
      });
    }
  } catch (err) {
    console.error("Failed to send owner KYC notification email:", err);
  }

  return updatedOwner;
};

const updateUserStatus = async (
  targetUserId: string,
  currentAdminUserId: string,
  payload: IUpdateUserStatusPayload,
) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, "Target user not found");
  }

  if (targetUser.role === Role.ADMIN) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Cannot modify the status of the Admin account",
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: payload.status },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  // Record Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: currentAdminUserId,
        action: `USER_STATUS_${payload.status}`,
        entityType: "USER",
        entityId: targetUserId,
        meta: { status: payload.status },
      },
    });
  } catch (err) {
    console.warn("Audit log creation error:", err);
  }

  return updatedUser;
};

const getAdminProfile = async (userId: string) => {
  const admin = await prisma.admin.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, "Admin profile not found");
  }

  return admin;
};

const getPlatformOverview = async () => {
  const [
    totalUsers,
    totalOwners,
    totalTenants,
    pendingKycCount,
    totalProperties,
    publishedProperties,
    totalRooms,
    activeLeases,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.owner.count({ where: { isDeleted: false } }),
    prisma.tenant.count({ where: { isDeleted: false } }),
    prisma.owner.count({
      where: {
        verificationStatus: OwnerVerificationStatus.PENDING,
        isDeleted: false,
      },
    }),
    prisma.property.count({ where: { isDeleted: false } }),
    prisma.property.count({
      where: { status: "PUBLISHED", isDeleted: false },
    }),
    prisma.room.count({ where: { isDeleted: false } }),
    prisma.lease.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    totalUsers,
    totalOwners,
    totalTenants,
    pendingKycCount,
    totalProperties,
    publishedProperties,
    totalRooms,
    activeLeases,
  };
};

const getAuditLogs = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 20;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    data: logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const adminService = {
  getPendingKycOwners,
  updateOwnerKycStatus,
  updateUserStatus,
  getAdminProfile,
  getPlatformOverview,
  getAuditLogs,
};
