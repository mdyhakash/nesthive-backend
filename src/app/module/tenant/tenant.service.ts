import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IQuery } from "../../../interfaces";
import { TenantWhereInput } from "../../../generated/prisma/models";
import { IUpdateTenantProfile } from "./tenant.interface";

const getTenantOrThrow = async (userId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId } });
  if (!tenant)
    throw new AppError(httpStatus.NOT_FOUND, "Tenant profile not found");
  return tenant;
};

const getMyTenantProfile = async (userId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { userId, isDeleted: false },
    include: {
      roommatePreference: true,
      user: { select: { email: true, imageUrl: true, emailVerified: true } },
    },
  });

  if (!tenant)
    throw new AppError(httpStatus.NOT_FOUND, "Tenant profile not found");

  return tenant;
};

const updateMyTenantProfile = async (
  userId: string,
  payload: IUpdateTenantProfile,
) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.tenant.update({
    where: { id: tenant.id },
    data: payload,
  });
};

const getAllTenants = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: TenantWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { email: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (query.gender) {
    andConditions.push({ gender: query.gender });
  }

  andConditions.push({ isDeleted: false });

  const tenants = await prisma.tenant.findMany({
    where: { AND: andConditions },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: { user: { select: { status: true, emailVerified: true } } },
  });

  const total = await prisma.tenant.count({ where: { AND: andConditions } });

  return {
    data: tenants,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getTenantById = async (tenantId: string) => {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, isDeleted: false },
    include: {
      roommatePreference: true,
      user: { select: { status: true, emailVerified: true } },
    },
  });

  if (!tenant) throw new AppError(httpStatus.NOT_FOUND, "Tenant not found");
  return tenant;
};

const deactivateMyAccount = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return tx.user.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: new Date(), status: "DELETED" },
    });
  });
};

export const tenantService = {
  getMyTenantProfile,
  updateMyTenantProfile,
  getAllTenants,
  getTenantById,
  deactivateMyAccount,
};
