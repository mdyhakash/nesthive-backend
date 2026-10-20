import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import ejs from "ejs";
import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import type { IQuery } from "../../../interfaces";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  ICreateManagerPayload,
  IUpdateManagerPayload,
} from "./manager.interface";

const createManager = async (
  creatorUserId: string,
  creatorRole: Role,
  payload: ICreateManagerPayload,
) => {
  if (creatorRole !== Role.ADMIN && creatorRole !== Role.OWNER) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only Admins and Owners are allowed to create Managers",
    );
  }

  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A user with this email address already exists",
    );
  }

  // Generate temporary password if not provided
  const rawPassword =
    payload.password ||
    `Nest${crypto.randomBytes(3).toString("hex")}@${crypto.randomInt(10, 99)}`;

  const hashedPassword = await bcrypt.hash(
    rawPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const newManager = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email,
        password: hashedPassword,
        role: Role.MANAGER,
        emailVerified: true,
        needPasswordChange: true,
      },
    });

    const manager = await tx.manager.create({
      data: {
        name: payload.name,
        email,
        userId: user.id,
        createdById: creatorUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return manager;
  });

  // Record audit log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: creatorUserId,
        action: "CREATE_MANAGER",
        entityType: "MANAGER",
        entityId: newManager.id,
        meta: {
          email,
          name: payload.name,
          creatorRole,
        },
      },
    });
  } catch (err) {
    console.warn("Audit log creation error:", err);
  }

  // Send onboarding email with temporary credentials
  try {
    const templatePath = path.join(
      process.cwd(),
      "src/app/templates/welcome-manager.ejs",
    );
    const loginUrl = `${config.frontend_url || "http://localhost:3000"}/login`;

    const html = await ejs.renderFile(templatePath, {
      name: payload.name,
      email,
      password: rawPassword,
      loginUrl,
    });

    await transporter.sendMail({
      from: `"NestHive" <${config.email_sender}>`,
      to: email,
      subject: "Welcome to NestHive! Your Manager Account Credentials",
      html,
    });
  } catch (err) {
    console.error("Failed to send manager onboarding email:", err);
  }

  return newManager;
};

const getMyManagerProfile = async (userId: string) => {
  const manager = await prisma.manager.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          imageUrl: true,
          createdAt: true,
        },
      },
      assignedMaintenanceRequests: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          room: {
            select: {
              roomNumber: true,
              property: { select: { title: true, address: true } },
            },
          },
        },
      },
    },
  });

  if (!manager || manager.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager profile not found");
  }

  return manager;
};

const getAllManagers = async (
  creatorUserId: string,
  creatorRole: Role,
  query: IQuery,
) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    isDeleted: false,
  };

  // Owners only see managers they created
  if (creatorRole === Role.OWNER) {
    whereCondition.createdById = creatorUserId;
  }

  const [managers, total] = await Promise.all([
    prisma.manager.findMany({
      where: whereCondition,
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            assignedMaintenanceRequests: true,
          },
        },
      },
    }),
    prisma.manager.count({ where: whereCondition }),
  ]);

  return {
    data: managers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getManagerById = async (
  managerId: string,
  creatorUserId: string,
  creatorRole: Role,
) => {
  const manager = await prisma.manager.findUnique({
    where: { id: managerId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          imageUrl: true,
          createdAt: true,
        },
      },
      assignedMaintenanceRequests: {
        include: {
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

  if (!manager || manager.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
  }

  if (creatorRole === Role.OWNER && manager.createdById !== creatorUserId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have access to view this manager",
    );
  }

  return manager;
};

const updateManager = async (
  managerId: string,
  creatorUserId: string,
  creatorRole: Role,
  payload: IUpdateManagerPayload,
) => {
  const manager = await prisma.manager.findUnique({
    where: { id: managerId },
  });

  if (!manager || manager.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
  }

  if (creatorRole === Role.OWNER && manager.createdById !== creatorUserId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to update this manager",
    );
  }

  return prisma.$transaction(async (tx) => {
    if (payload.name) {
      await tx.user.update({
        where: { id: manager.userId },
        data: { name: payload.name },
      });
    }

    return tx.manager.update({
      where: { id: managerId },
      data: {
        name: payload.name ?? manager.name,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
  });
};

const deleteManager = async (
  managerId: string,
  creatorUserId: string,
  creatorRole: Role,
) => {
  const manager = await prisma.manager.findUnique({
    where: { id: managerId },
  });

  if (!manager || manager.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
  }

  if (creatorRole === Role.OWNER && manager.createdById !== creatorUserId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to delete this manager",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.manager.update({
      where: { id: managerId },
      data: { isDeleted: true },
    });

    await tx.user.update({
      where: { id: manager.userId },
      data: {
        isDeleted: true,
        status: UserStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: creatorUserId,
        action: "DELETE_MANAGER",
        entityType: "MANAGER",
        entityId: managerId,
        meta: { deletedByRole: creatorRole },
      },
    });
  });

  return { message: "Manager deactivated successfully" };
};

export const managerService = {
  createManager,
  getMyManagerProfile,
  getAllManagers,
  getManagerById,
  updateManager,
  deleteManager,
};
