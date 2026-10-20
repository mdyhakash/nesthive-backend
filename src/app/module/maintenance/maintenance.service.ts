import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import {
  MaintenancePriority,
  MaintenanceStatus,
  OccupancyStatus,
  Role,
} from "../../../generated/prisma/enums";
import type { IQuery } from "../../../interfaces";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  ICreateMaintenancePayload,
  IUpdateMaintenanceStatusPayload,
} from "./maintenance.interface";

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

const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "auto", folder: "nesthive/maintenance" },
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

const createMaintenanceRequest = async (
  userId: string,
  payload: ICreateMaintenancePayload,
  fileBuffer?: Buffer,
) => {
  const tenant = await getTenantOrThrow(userId);

  const room = await prisma.room.findUnique({
    where: { id: payload.roomId, isDeleted: false },
    include: { property: true },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  // Verify that the tenant is an active occupant of this room
  const isOccupant = await prisma.roomOccupant.findFirst({
    where: {
      roomId: room.id,
      tenantId: tenant.id,
      status: OccupancyStatus.ACTIVE,
    },
  });

  if (!isOccupant) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You must be an active resident of this room to submit a maintenance request",
    );
  }

  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (fileBuffer) {
    const uploadResult = await uploadToCloudinary(fileBuffer);
    imageUrl = uploadResult.secure_url;
    imagePublicId = uploadResult.public_id;
  }

  return prisma.maintenanceRequest.create({
    data: {
      roomId: room.id,
      tenantId: tenant.id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority || MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.OPEN,
      imageUrl,
      imagePublicId,
    },
    include: {
      room: {
        select: {
          roomNumber: true,
          property: { select: { title: true, address: true } },
        },
      },
    },
  });
};

const getMyMaintenanceRequests = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.maintenanceRequest.findMany({
    where: { tenantId: tenant.id },
    include: {
      room: {
        select: {
          roomNumber: true,
          property: { select: { title: true, address: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getOwnerMaintenanceRequests = async (userId: string) => {
  const owner = await getOwnerOrThrow(userId);

  return prisma.maintenanceRequest.findMany({
    where: {
      room: {
        property: {
          ownerId: owner.id,
        },
      },
    },
    include: {
      tenant: {
        select: { id: true, name: true, email: true, contactNumber: true },
      },
      room: {
        select: {
          roomNumber: true,
          property: { select: { id: true, title: true, address: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getMaintenanceById = async (
  userId: string,
  userRole: Role,
  requestId: string,
) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: {
      tenant: { select: { id: true, name: true, email: true, userId: true } },
      room: {
        include: {
          property: { select: { id: true, title: true, ownerId: true } },
        },
      },
    },
  });

  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, "Maintenance request not found");
  }

  if (userRole === Role.TENANT && request.tenant.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this request",
    );
  }

  if (userRole === Role.OWNER) {
    const owner = await getOwnerOrThrow(userId);
    if (request.room.property.ownerId !== owner.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not own the property for this request",
      );
    }
  }

  return request;
};

const updateMaintenanceStatus = async (
  userId: string,
  userRole: Role,
  requestId: string,
  payload: IUpdateMaintenanceStatusPayload,
) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: {
      room: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, "Maintenance request not found");
  }

  if (userRole === Role.OWNER) {
    const owner = await getOwnerOrThrow(userId);
    if (request.room.property.ownerId !== owner.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not own the property for this maintenance ticket",
      );
    }
  }

  return prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status: payload.status,
      resolutionNote: payload.resolutionNote,
      assignedTo: payload.assignedTo,
    },
  });
};

const getAllMaintenanceRequests = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  const requests = await prisma.maintenanceRequest.findMany({
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      tenant: { select: { name: true, email: true } },
      room: {
        select: {
          roomNumber: true,
          property: { select: { title: true } },
        },
      },
    },
  });

  const total = await prisma.maintenanceRequest.count();

  return {
    data: requests,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const maintenanceService = {
  createMaintenanceRequest,
  getMyMaintenanceRequests,
  getOwnerMaintenanceRequests,
  getMaintenanceById,
  updateMaintenanceStatus,
  getAllMaintenanceRequests,
};
