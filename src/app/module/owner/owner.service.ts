import httpStatus from "http-status";
import type { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";
import { AppError } from "../../utils/AppError";

const submitKyc = async (userId: string, buffer: Buffer) => {
  const owner = await prisma.owner.findUnique({ where: { userId } });

  if (!owner)
    throw new AppError(httpStatus.NOT_FOUND, "Owner profile not found");

  if (owner.verificationStatus === "APPROVED") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account is already verified",
    );
  }

  const cloudinaryResult = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { resource_type: "auto", folder: "nesthive/owner-kyc" },
          (error, result) => {
            if (error) return reject(error);
            if (!result)
              return reject(new Error("No result returned from Cloudinary"));
            resolve(result);
          },
        )
        .end(buffer);
    },
  );

  const result = await prisma.$transaction(async (tx) => {
    const updatedOwner = await tx.owner.update({
      where: { id: owner.id },
      data: {
        kycDocumentUrl: cloudinaryResult.secure_url,
        kycDocumentPublicId: cloudinaryResult.public_id,
        verificationStatus: "PENDING",
        rejectionReason: null,
      },
    });

    await tx.document.create({
      data: {
        type: "OWNER_KYC",
        fileUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        ownerId: owner.id,
      },
    });

    return updatedOwner;
  });

  return result;
};

const getMyOwnerProfile = async (userId: string) => {
  const owner = await prisma.owner.findUniqueOrThrow({
    where: { userId: userId },
    include: { properties: true },
  });

  return owner;
};

export const ownerService = {
  submitKyc,
  getMyOwnerProfile,
};
