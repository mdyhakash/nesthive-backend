import httpStatus from "http-status";
import {
  BillSplitStatus,
  BillStatus,
  OccupancyStatus,
  Role,
  SplitType,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateUtilityBillPayload } from "./utilityBill.interface";

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

const createUtilityBill = async (
  userId: string,
  userRole: Role,
  payload: ICreateUtilityBillPayload,
) => {
  const room = await prisma.room.findUnique({
    where: { id: payload.roomId, isDeleted: false },
    include: { property: true },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  // Authorization check: Must be the room's Owner or an active occupant
  if (userRole === Role.OWNER) {
    const owner = await getOwnerOrThrow(userId);
    if (room.property.ownerId !== owner.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not own the property for this room",
      );
    }
  } else if (userRole === Role.TENANT) {
    const tenant = await getTenantOrThrow(userId);
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
        "Only an active occupant of this room or the owner can issue a utility bill",
      );
    }
  }

  // Check if a bill for this month already exists
  const startOfMonth = new Date(payload.month);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const existingBill = await prisma.utilityBill.findFirst({
    where: {
      roomId: room.id,
      month: startOfMonth,
    },
  });

  if (existingBill) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A utility bill has already been created for this room for the specified month",
    );
  }

  // Fetch all active occupants of this room
  const activeOccupants = await prisma.roomOccupant.findMany({
    where: {
      roomId: room.id,
      status: OccupancyStatus.ACTIVE,
    },
    include: {
      tenant: true,
    },
  });

  if (activeOccupants.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot create utility bill: This room currently has no active occupants to split the bill with",
    );
  }

  const splitType = payload.splitType || SplitType.EQUAL;
  let splitData: { tenantId: string; shareAmount: number }[] = [];

  if (splitType === SplitType.CUSTOM) {
    if (!payload.customSplits || payload.customSplits.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Custom splits breakdown must be provided when SplitType is CUSTOM",
      );
    }

    const totalCalculated = payload.customSplits.reduce(
      (sum, s) => sum + Number(s.shareAmount),
      0,
    );

    if (Math.abs(totalCalculated - Number(payload.totalAmount)) > 0.5) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `The sum of custom split shares (${totalCalculated}) does not match the total bill amount (${payload.totalAmount})`,
      );
    }

    splitData = payload.customSplits.map((s) => ({
      tenantId: s.tenantId,
      shareAmount: Number(s.shareAmount),
    }));
  } else {
    // EQUAL split among all active roommates
    const perPersonShare =
      Math.round((Number(payload.totalAmount) / activeOccupants.length) * 100) /
      100;

    splitData = activeOccupants.map((occ) => ({
      tenantId: occ.tenantId,
      shareAmount: perPersonShare,
    }));
  }

  return prisma.$transaction(async (tx) => {
    const utilityBill = await tx.utilityBill.create({
      data: {
        roomId: room.id,
        month: startOfMonth,
        totalAmount: payload.totalAmount,
        splitType,
        status: BillStatus.UNSETTLED,
        createdById: userId,
      },
    });

    await tx.utilityBillSplit.createMany({
      data: splitData.map((s) => ({
        utilityBillId: utilityBill.id,
        tenantId: s.tenantId,
        shareAmount: s.shareAmount,
        status: BillSplitStatus.UNPAID,
      })),
    });

    return tx.utilityBill.findUnique({
      where: { id: utilityBill.id },
      include: {
        splits: {
          include: {
            tenant: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  });
};

const getMyTenantSplits = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.utilityBillSplit.findMany({
    where: { tenantId: tenant.id },
    include: {
      utilityBill: {
        include: {
          room: {
            select: {
              id: true,
              roomNumber: true,
              property: { select: { title: true, address: true } },
            },
          },
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getRoomUtilityBills = async (userId: string, roomId: string) => {
  const owner = await getOwnerOrThrow(userId);

  const room = await prisma.room.findFirst({
    where: { id: roomId, isDeleted: false },
    include: { property: true },
  });

  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  if (room.property.ownerId !== owner.id) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this room");
  }

  return prisma.utilityBill.findMany({
    where: { roomId },
    include: {
      splits: {
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          payment: true,
        },
      },
    },
    orderBy: { month: "desc" },
  });
};

const getUtilityBillById = async (billId: string) => {
  const bill = await prisma.utilityBill.findUnique({
    where: { id: billId },
    include: {
      room: {
        select: {
          id: true,
          roomNumber: true,
          property: { select: { id: true, title: true, address: true } },
        },
      },
      splits: {
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          payment: true,
        },
      },
    },
  });

  if (!bill) {
    throw new AppError(httpStatus.NOT_FOUND, "Utility bill not found");
  }

  return bill;
};

export const utilityBillService = {
  createUtilityBill,
  getMyTenantSplits,
  getRoomUtilityBills,
  getUtilityBillById,
};
