import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ICreateRoom, IUpdateRoom } from "./room.interface";
import { IQuery } from "../../../interfaces";
import { RoomWhereInput } from "../../../generated/prisma/models";
import {
  ListingStatus,
  OwnerVerificationStatus,
  RoomType,
} from "../../../generated/prisma/enums";

const getOwnerOrThrow = async (userId: string) => {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner)
    throw new AppError(httpStatus.NOT_FOUND, "Owner profile not found");
  return owner;
};

const getOwnedPropertyOrThrow = async (ownerId: string, propertyId: string) => {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  if (property.ownerId !== ownerId)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this property");

  return property;
};

const getOwnedRoomOrThrow = async (ownerId: string, roomId: string) => {
  const room = await prisma.room.findFirst({
    where: { id: roomId, isDeleted: false },
    include: { property: true },
  });

  if (!room) throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  if (room.property.ownerId !== ownerId)
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this room");

  return room;
};

const createRoom = async (
  userId: string,
  propertyId: string,
  payload: ICreateRoom,
) => {
  const owner = await getOwnerOrThrow(userId);
  await getOwnedPropertyOrThrow(owner.id, propertyId);

  const room = await prisma.room.create({
    data: { ...payload, propertyId },
  });

  return room;
};

const getAllRooms = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: RoomWhereInput[] = [];

  //Searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [{ roomNumber: { contains: query.searchTerm, mode: "insensitive" } }],
    });
  }

  //filtering
  if (query.propertyId) {
    andConditions.push({ propertyId: query.propertyId });
  }
  if (query.city) {
    andConditions.push({
      property: {
        is: {
          city: { equals: query.city, mode: "insensitive" },
        },
      },
    });
  }

  if (query.area) {
    andConditions.push({
      property: {
        is: {
          area: { equals: query.area, mode: "insensitive" },
        },
      },
    });
  }

  if (query.roomType) {
    andConditions.push({
      roomType: query.roomType as RoomType,
    });
  }

  if (query.status) {
    andConditions.push({
      status: query.status as ListingStatus,
    });
  }

  if (query.minRent || query.maxRent) {
    andConditions.push({
      rentAmount: {
        ...(query.minRent && { gte: Number(query.minRent) }),
        ...(query.maxRent && { lte: Number(query.maxRent) }),
      },
    });
  }

  if (query.minCapacity) {
    andConditions.push({
      capacity: { gte: Number(query.minCapacity) },
    });
  }

  andConditions.push({ status: ListingStatus.PUBLISHED });
  andConditions.push({ isDeleted: false });

  const allRooms = await prisma.room.findMany({
    where: {
      AND: andConditions.length > 0 ? andConditions : undefined,
    },

    take: limit,
    skip: skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    include: {
      property: {
        select: { title: true, city: true, area: true },
      },
    },
  });

  const totalRoomCount = await prisma.room.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: allRooms,
    meta: {
      page: page,
      limit: limit,
      total: totalRoomCount,
      totalPages: Math.ceil(totalRoomCount / limit),
    },
  };
};

const getRoomsByProperty = async (propertyId: string) => {
  return prisma.room.findMany({
    where: { propertyId, isDeleted: false, status: ListingStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
  });
};

const getRoomById = async (id: string) => {
  const room = await prisma.room.findFirst({
    where: { id, isDeleted: false },
    include: {
      property: {
        select: { title: true, city: true, area: true, ownerId: true },
      },
    },
  });

  if (!room) throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  return room;
};

const getMyRooms = async (userId: string, propertyId: string) => {
  const owner = await getOwnerOrThrow(userId);
  await getOwnedPropertyOrThrow(owner.id, propertyId);

  return prisma.room.findMany({
    where: { propertyId, isDeleted: false },
    orderBy: { createdAt: "desc" },
  });
};

const updateRoom = async (
  userId: string,
  roomId: string,
  payload: IUpdateRoom,
) => {
  const owner = await getOwnerOrThrow(userId);
  await getOwnedRoomOrThrow(owner.id, roomId);

  const updatedRoom = prisma.room.update({
    where: { id: roomId },
    data: payload,
  });
  return updatedRoom;
};

const publishRoom = async (userId: string, roomId: string) => {
  const owner = await getOwnerOrThrow(userId);

  if (owner.verificationStatus !== OwnerVerificationStatus.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account must be KYC-verified before publishing",
    );
  }

  await getOwnedRoomOrThrow(owner.id, roomId);

  return prisma.room.update({
    where: { id: roomId },
    data: { status: ListingStatus.PUBLISHED },
  });
};

const deleteRoom = async (userId: string, roomId: string) => {
  const owner = await getOwnerOrThrow(userId);
  await getOwnedRoomOrThrow(owner.id, roomId);

  return prisma.room.update({
    where: { id: roomId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const roomService = {
  createRoom,
  getAllRooms,
  getRoomsByProperty,
  getRoomById,
  getMyRooms,
  updateRoom,
  publishRoom,
  deleteRoom,
};
