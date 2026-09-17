import httpStatus from "http-status";
import {
  ApplicationStatus,
  ListingStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  ICreateApplication,
  IUpdateApplicationStatus,
} from "./application.interface";

const getOwnerOrThrow = async (userId: string) => {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner)
    throw new AppError(httpStatus.NOT_FOUND, "Owner profile not found");
  return owner;
};

const getTenantOrThrow = async (userId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId } });
  if (!tenant)
    throw new AppError(httpStatus.NOT_FOUND, "Tenant profile not found");
  return tenant;
};

const createApplication = async (
  userId: string,
  payload: ICreateApplication,
) => {
  const tenant = await getTenantOrThrow(userId);

  const room = await prisma.room.findFirst({
    where: {
      id: payload.roomId,
      isDeleted: false,
      status: ListingStatus.PUBLISHED,
    },
  });

  if (!room)
    throw new AppError(httpStatus.NOT_FOUND, "Room not found or not available");

  const existingApplication = await prisma.application.findFirst({
    where: {
      roomId: payload.roomId,
      tenantId: tenant.id,
      status: { in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] },
    },
  });

  if (existingApplication) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You already have an active application for this room",
    );
  }

  return prisma.application.create({
    data: {
      roomId: payload.roomId,
      tenantId: tenant.id,
      status: ApplicationStatus.PENDING,
    },
  });
};

const getMyApplications = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.application.findMany({
    where: { tenantId: tenant.id },
    include: {
      room: {
        select: {
          roomNumber: true,
          rentAmount: true,
          property: { select: { title: true, city: true, area: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getApplicationsForRoom = async (userId: string, roomId: string) => {
  const owner = await getOwnerOrThrow(userId);

  const room = await prisma.room.findFirst({
    where: { id: roomId, isDeleted: false },
    include: { property: true },
  });

  if (!room) throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  if (room.property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this room");

  return prisma.application.findMany({
    where: { roomId },
    include: {
      tenant: { select: { name: true, contactNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getApplicationById = async (userId: string, applicationId: string) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      room: { include: { property: true } },
      tenant: { select: { name: true, contactNumber: true, userId: true } },
    },
  });

  if (!application)
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");

  const isTenant = application.tenant.userId === userId;
  const isOwner = application.room.property.ownerId === userId;

  if (!isTenant && !isOwner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this application",
    );
  }

  return application;
};

const updateApplicationStatus = async (
  userId: string,
  applicationId: string,
  payload: IUpdateApplicationStatus,
) => {
  const owner = await getOwnerOrThrow(userId);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { room: { include: { property: true } } },
  });

  if (!application)
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  if (application.room.property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this room");

  if (application.status !== ApplicationStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This application has already been reviewed",
    );
  }

  return prisma.application.update({
    where: { id: applicationId },
    data: {
      status: payload.status,
      rejectionReason:
        payload.status === "REJECTED" ? payload.rejectionReason : null,
      paymentDeadline:
        payload.status === "APPROVED" ? payload.paymentDeadline : null,
    },
  });
};

const withdrawApplication = async (userId: string, applicationId: string) => {
  const tenant = await getTenantOrThrow(userId);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application)
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  if (application.tenantId !== tenant.id)
    throw new AppError(httpStatus.FORBIDDEN, "This is not your application");

  if (application.status !== ApplicationStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending applications can be withdrawn",
    );
  }

  return prisma.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.WITHDRAWN },
  });
};

export const ApplicationService = {
  createApplication,
  getMyApplications,
  getApplicationsForRoom,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
};
