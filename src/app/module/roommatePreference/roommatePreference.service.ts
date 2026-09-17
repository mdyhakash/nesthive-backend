import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  IUpsertRoommatePreference,
  IMatchResult,
} from "./roommatePreference.interface";

const getTenantOrThrow = async (userId: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { userId } });
  if (!tenant)
    throw new AppError(httpStatus.NOT_FOUND, "Tenant profile not found");
  return tenant;
};

const upsertMyPreference = async (
  userId: string,
  payload: IUpsertRoommatePreference,
) => {
  const tenant = await getTenantOrThrow(userId);

  return prisma.roommatePreference.upsert({
    where: { tenantId: tenant.id },
    create: { ...payload, tenantId: tenant.id },
    update: payload,
  });
};

const getMyPreference = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  const preference = await prisma.roommatePreference.findUnique({
    where: { tenantId: tenant.id },
  });

  if (!preference)
    throw new AppError(
      httpStatus.NOT_FOUND,
      "You have not set a roommate preference yet",
    );

  return preference;
};

const deleteMyPreference = async (userId: string) => {
  const tenant = await getTenantOrThrow(userId);

  const preference = await prisma.roommatePreference.findUnique({
    where: { tenantId: tenant.id },
  });

  if (!preference)
    throw new AppError(httpStatus.NOT_FOUND, "No preference to delete");

  await prisma.roommatePreference.delete({ where: { tenantId: tenant.id } });

  return null;
};

const findMatches = async (
  userId: string,
  limit = 10,
): Promise<IMatchResult[]> => {
  const tenant = await getTenantOrThrow(userId);

  const myPreference = await prisma.roommatePreference.findUnique({
    where: { tenantId: tenant.id },
  });

  if (!myPreference)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Set your own roommate preference before searching for matches",
    );

  const housedTenantIds = (
    await prisma.roomOccupant.findMany({
      where: { status: "ACTIVE" },
      select: { tenantId: true },
    })
  ).map((occ) => occ.tenantId);

  const candidates = await prisma.roommatePreference.findMany({
    where: {
      tenantId: {
        not: tenant.id,
        notIn: housedTenantIds,
      },
      budgetMin: { lte: myPreference.budgetMax },
      budgetMax: { gte: myPreference.budgetMin },
    },
    include: {
      tenant: { select: { id: true, name: true, contactNumber: true } },
    },
  });

  const scored: IMatchResult[] = candidates.map((candidate) => {
    const overlapMin = Math.max(myPreference.budgetMin, candidate.budgetMin);
    const overlapMax = Math.min(myPreference.budgetMax, candidate.budgetMax);
    const hasOverlap = overlapMax >= overlapMin;

    const combinedRange =
      Math.max(myPreference.budgetMax, candidate.budgetMax) -
        Math.min(myPreference.budgetMin, candidate.budgetMin) || 1;
    const overlapSize = hasOverlap ? overlapMax - overlapMin : 0;
    const budgetScore = Math.round((overlapSize / combinedRange) * 50);

    const sameArea =
      !!myPreference.preferredArea &&
      !!candidate.preferredArea &&
      myPreference.preferredArea.toLowerCase() ===
        candidate.preferredArea.toLowerCase();
    const areaScore = sameArea ? 30 : 0;

    const sharedTags = myPreference.lifestyleTags.filter((tag) =>
      candidate.lifestyleTags
        .map((t) => t.toLowerCase())
        .includes(tag.toLowerCase()),
    );
    const lifestyleScore = Math.min(sharedTags.length * 4, 20);

    return {
      tenantId: candidate.tenant.id,
      name: candidate.tenant.name,
      contactNumber: candidate.tenant.contactNumber,
      matchScore: budgetScore + areaScore + lifestyleScore,
      budgetOverlap: hasOverlap ? { min: overlapMin, max: overlapMax } : null,
      sharedLifestyleTags: sharedTags,
      sameArea,
      preference: {
        budgetMin: candidate.budgetMin,
        budgetMax: candidate.budgetMax,
        preferredArea: candidate.preferredArea,
        moveInDate: candidate.moveInDate,
        bio: candidate.bio,
      },
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
};

export const roommatePreferenceService = {
  upsertMyPreference,
  getMyPreference,
  deleteMyPreference,
  findMatches,
};
