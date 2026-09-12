import httpStatus from "http-status";
import { ListingStatus, ViewingStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  ICreateViewingRequest,
  IUpdateViewingRequestStatus,
} from "./viewingRequest.interface";

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

const createViewingRequest = async (
  userId: string,
  roomId: string,
  payload: ICreateViewingRequest,
) => {
  const tenant = await getTenantOrThrow(userId);

  const room = await prisma.room.findFirst({
    where: { id: roomId, isDeleted: false, status: ListingStatus.PUBLISHED },
  });

  if (!room)
    throw new AppError(httpStatus.NOT_FOUND, "Room not found or not available");

  const existingRequest = await prisma.viewingRequest.findFirst({
    where: {
      roomId,
      tenantId: tenant.id,
      status: ViewingStatus.PENDING,
    },
  });

  if (existingRequest) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You already have a pending viewing request for this room",
    );
  }

  const viewingRequest = await prisma.viewingRequest.create({
    data: {
      roomId,
      tenantId: tenant.id,
      requestedAt: payload.requestedAt,
      status: ViewingStatus.PENDING,
    },
  });

  return viewingRequest;
};

const getMyViewingRequests = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.viewingRequest.findMany({
    where: { tenantId: tenant.id },
    include: {
      room: {
        select: {
          roomNumber: true,
          property: { select: { title: true, city: true, area: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getViewingRequestsForRoom = async (userId: string, roomId: string) => {
  const owner = await getOwnerOrThrow(userId);

  const room = await prisma.room.findFirst({
    where: { id: roomId, isDeleted: false },
    include: { property: true },
  });

  if (!room) throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  if (room.property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this room");

  return prisma.viewingRequest.findMany({
    where: { roomId },
    include: {
      tenant: { select: { name: true, contactNumber: true } },
    },
    orderBy: { requestedAt: "asc" },
  });
};

const getViewingRequestById = async (id: string) => {
  const viewingRequest = await prisma.viewingRequest.findUnique({
    where: { id },
    include: {
      room: { include: { property: true } },
      tenant: { select: { name: true, contactNumber: true } },
    },
  });

  if (!viewingRequest)
    throw new AppError(httpStatus.NOT_FOUND, "Viewing request not found");
  return viewingRequest;
};

const updateViewingRequestStatus = async (
  userId: string,
  viewingRequestId: string,
  payload: IUpdateViewingRequestStatus,
) => {
  const owner = await getOwnerOrThrow(userId);

  const viewingRequest = await prisma.viewingRequest.findUnique({
    where: { id: viewingRequestId },
    include: { room: { include: { property: true } } },
  });

  if (!viewingRequest)
    throw new AppError(httpStatus.NOT_FOUND, "Viewing request not found");
  if (viewingRequest.room.property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this room");

  if (viewingRequest.status !== ViewingStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This viewing request has already been reviewed",
    );
  }

  return prisma.viewingRequest.update({
    where: { id: viewingRequestId },
    data: {
      status: payload.status,
      ownerNote: payload.ownerNote,
    },
  });
};

const cancelViewingRequest = async (
  userId: string,
  viewingRequestId: string,
) => {
  const tenant = await getTenantOrThrow(userId);

  const viewingRequest = await prisma.viewingRequest.findUnique({
    where: { id: viewingRequestId },
  });

  if (!viewingRequest)
    throw new AppError(httpStatus.NOT_FOUND, "Viewing request not found");
  if (viewingRequest.tenantId !== tenant.id)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This is not your viewing request",
    );

  if (viewingRequest.status !== ViewingStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending requests can be cancelled",
    );
  }

  return prisma.viewingRequest.update({
    where: { id: viewingRequestId },
    data: { status: ViewingStatus.CANCELLED },
  });
};

export const viewingRequestService = {
  createViewingRequest,
  getMyViewingRequests,
  getViewingRequestsForRoom,
  getViewingRequestById,
  updateViewingRequestStatus,
  cancelViewingRequest,
};
