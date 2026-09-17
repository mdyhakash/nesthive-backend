import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IQuery } from "../../../interfaces";
import { LeaseWhereInput } from "../../../generated/prisma/models";
import {
  LeaseStatus,
  OccupancyStatus,
  ListingStatus,
} from "../../../generated/prisma/enums";
import { ITerminateLease } from "./lease.interface";

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

const getMyLeasesAsTenant = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.lease.findMany({
    where: { tenantId: tenant.id },
    include: {
      room: {
        select: {
          roomNumber: true,
          property: { select: { title: true, area: true, city: true } },
        },
      },
      owner: { select: { name: true, contactNumber: true } },
      payments: {
        select: { id: true, type: true, status: true, amount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getMyLeasesAsOwner = async (userId: string, query: IQuery) => {
  const owner = await getOwnerOrThrow(userId);

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const where: LeaseWhereInput = { ownerId: owner.id };
  if (query.status) where.status = query.status as LeaseStatus;

  const leases = await prisma.lease.findMany({
    where,
    take: limit,
    skip,
    include: {
      tenant: { select: { name: true, contactNumber: true } },
      room: { select: { roomNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.lease.count({ where });

  return {
    data: leases,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getLeaseById = async (userId: string, leaseId: string) => {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      room: { include: { property: true } },
      tenant: { select: { name: true, contactNumber: true, userId: true } },
      owner: { select: { name: true, contactNumber: true, userId: true } },
      payments: true,
    },
  });

  if (!lease) throw new AppError(httpStatus.NOT_FOUND, "Lease not found");

  const isTenant = lease.tenant.userId === userId;
  const isOwner = lease.owner.userId === userId;

  if (!isTenant && !isOwner)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this lease",
    );

  return lease;
};

const terminateLease = async (
  userId: string,
  leaseId: string,
  payload: ITerminateLease,
) => {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      room: true,
      tenant: { select: { userId: true } },
      owner: { select: { userId: true } },
    },
  });

  if (!lease) throw new AppError(httpStatus.NOT_FOUND, "Lease not found");

  const isTenant = lease.tenant.userId === userId;
  const isOwner = lease.owner.userId === userId;

  if (!isTenant && !isOwner)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to terminate this lease",
    );

  if (lease.status !== LeaseStatus.ACTIVE)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only active leases can be terminated",
    );

  const moveOutDate = payload.moveOutDate ?? new Date();

  return prisma.$transaction(async (tx) => {
    const updatedLease = await tx.lease.update({
      where: { id: leaseId },
      data: {
        status: LeaseStatus.TERMINATED,
        terminatedAt: new Date(),
        terminationReason: payload.terminationReason,
      },
    });

    await tx.roomOccupant.updateMany({
      where: {
        roomId: lease.roomId,
        tenantId: lease.tenantId,
        status: OccupancyStatus.ACTIVE,
      },
      data: { status: OccupancyStatus.MOVED_OUT, moveOutDate },
    });

    const newOccupantCount = Math.max(lease.room.occupantCount - 1, 0);

    await tx.room.update({
      where: { id: lease.roomId },
      data: {
        occupantCount: newOccupantCount,
        status: !lease.room.isDeleted
          ? ListingStatus.PUBLISHED
          : lease.room.status,
      },
    });

    return updatedLease;
  });
};

const getAllLeases = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const where: LeaseWhereInput = {};
  if (query.status) where.status = query.status as LeaseStatus;

  const leases = await prisma.lease.findMany({
    where,
    take: limit,
    skip,
    include: {
      tenant: { select: { name: true } },
      owner: { select: { name: true } },
      room: { select: { roomNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.lease.count({ where });

  return {
    data: leases,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const leaseService = {
  getMyLeasesAsTenant,
  getMyLeasesAsOwner,
  getLeaseById,
  terminateLease,
  getAllLeases,
};
