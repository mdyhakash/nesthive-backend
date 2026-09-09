import type { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
  console.log("🔥 uploadProfileImage CALLED");
  console.log("User ID:", userId);
  console.log("Buffer size:", buffer?.length);

  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      imagePublicId: true,
      imageUrl: true,
    },
  });

  console.log("Current user:", currentUser);

  const cloudinaryResult = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      console.log("🔥 Starting Cloudinary upload");

      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
          },
          (error, result) => {
            console.log("🔥 Cloudinary callback");

            if (error) {
              console.log("❌ Cloudinary error:", error);
              return reject(error);
            }

            if (!result) {
              return reject(new Error("No result returned from Cloudinary"));
            }

            console.log("✅ Cloudinary result:", result);

            resolve(result);
          },
        )
        .end(buffer);
    },
  );

  console.log("🔥 After Cloudinary");

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      imageUrl: cloudinaryResult.secure_url,
      imagePublicId: cloudinaryResult.public_id,
    },
    omit: {
      password: true,
    },
  });

  console.log("✅ Database updated:", updatedUser);

  if (currentUser?.imagePublicId) {
    await cloudinary.uploader.destroy(currentUser.imagePublicId);
  }

  return updatedUser;
};

export const UserServices = {
  uploadProfileImage,
};
