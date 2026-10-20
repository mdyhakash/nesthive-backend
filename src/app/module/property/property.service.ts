import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { ICreateProperty, IUpdateProperty } from "./property.interface";
import { PropertyWhereInput } from "../../../generated/prisma/models";
import {
  ListingStatus,
  OwnerVerificationStatus,
  PropertyType,
  Role,
} from "../../../generated/prisma/enums";
import { IQuery } from "../../../interfaces";

const getOwnerOrThrow = async (userId: string) => {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner)
    throw new AppError(httpStatus.NOT_FOUND, "Owner profile not found");
  return owner;
};

const createProperty = async (userId: string, payload: ICreateProperty) => {
  const owner = await getOwnerOrThrow(userId);

  const property = await prisma.property.create({
    data: { ...payload, ownerId: owner.id },
  });

  return property;
};

const getAllProperties = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: PropertyWhereInput[] = [];

  //Searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.searchTerm, mode: "insensitive" } },
        { city: { contains: query.searchTerm, mode: "insensitive" } },
        { area: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  //filtering
  if (query.city) {
    andConditions.push({
      city: { equals: query.city, mode: "insensitive" },
    });
  }

  if (query.area) {
    andConditions.push({
      area: { equals: query.area, mode: "insensitive" },
    });
  }

  if (query.type) {
    andConditions.push({
      type: query.type as PropertyType,
    });
  }

  if (query.status) {
    andConditions.push({
      status: query.status as ListingStatus,
    });
  }

  if (query.minRent || query.maxRent) {
    andConditions.push({
      rooms: {
        some: {
          rentAmount: {
            ...(query.minRent && { gte: Number(query.minRent) }),
            ...(query.maxRent && { lte: Number(query.maxRent) }),
          },
        },
      },
    });
  }

  andConditions.push({ isDeleted: false });

  const allProperties = await prisma.property.findMany({
    where: {
      AND: andConditions.length > 0 ? andConditions : undefined,
    },

    take: limit,
    skip: skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    include: {
      rooms: {
        where: { isDeleted: false },
      },

      owner: {
        select: { name: true },
      },
    },
  });

  const totalPropertyCount = await prisma.property.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: allProperties,
    meta: {
      page: page,
      limit: limit,
      total: totalPropertyCount,
      totalPages: Math.ceil(totalPropertyCount / limit),
    },
  };
};

const getPropertyById = async (id: string) => {
  const property = await prisma.property.findFirst({
    where: { id, isDeleted: false },
    include: {
      rooms: { where: { isDeleted: false } },
      owner: { select: { name: true } },
    },
  });

  if (!property) throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  return property;
};

const getMyProperties = async (userId: string) => {
  const owner = await getOwnerOrThrow(userId);

  return prisma.property.findMany({
    where: { ownerId: owner.id, isDeleted: false },
    include: { rooms: true },
    orderBy: { createdAt: "desc" },
  });
};

const updateProperty = async (
  userId: string,
  propertyId: string,
  payload: IUpdateProperty,
) => {
  const owner = await getOwnerOrThrow(userId);
  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  if (property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this property");

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: payload,
  });
  return updatedProperty;
};

const publishProperty = async (userId: string, propertyId: string) => {
  const owner = await getOwnerOrThrow(userId);

  if (owner.verificationStatus !== OwnerVerificationStatus.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account must be KYC-verified before publishing",
    );
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
  });
  if (!property) throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  if (property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this property");

  return prisma.property.update({
    where: { id: propertyId },
    data: { status: ListingStatus.PUBLISHED },
  });
};

const deleteProperty = async (userId: string, propertyId: string) => {
  const owner = await getOwnerOrThrow(userId);
  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  if (property.ownerId !== owner.id)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this property");

  return prisma.property.update({
    where: { id: propertyId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

const assignManager = async (
  userId: string,
  userRole: Role,
  propertyId: string,
  managerId: string | null,
) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (userRole === Role.OWNER) {
    const owner = await getOwnerOrThrow(userId);
    if (property.ownerId !== owner.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not own this property to assign a manager",
      );
    }
  }

  if (managerId) {
    const manager = await prisma.manager.findUnique({
      where: { id: managerId, isDeleted: false },
    });

    if (!manager) {
      throw new AppError(httpStatus.NOT_FOUND, "Manager not found or inactive");
    }

    // Owner can only assign managers they created or admin created
    if (
      userRole === Role.OWNER &&
      manager.createdById &&
      manager.createdById !== userId
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only assign managers that belong to your organization",
      );
    }
  }

  return prisma.property.update({
    where: { id: propertyId },
    data: { managerId },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const getAssignedPropertiesForManager = async (
  userId: string,
  query: IQuery,
) => {
  const manager = await prisma.manager.findUnique({
    where: { userId, isDeleted: false },
  });

  if (!manager) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager profile not found");
  }

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where: { managerId: manager.id, isDeleted: false },
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        rooms: {
          where: { isDeleted: false },
          select: {
            id: true,
            roomNumber: true,
            rentAmount: true,
            capacity: true,
            occupantCount: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            contactNumber: true,
          },
        },
      },
    }),
    prisma.property.count({
      where: { managerId: manager.id, isDeleted: false },
    }),
  ]);

  return {
    data: properties,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const propertyService = {
  createProperty,
  getAllProperties,
  getPropertyById,
  getMyProperties,
  updateProperty,
  publishProperty,
  deleteProperty,
  assignManager,
  getAssignedPropertiesForManager,
};
