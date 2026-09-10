import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
export const seedAdmin = async () => {
  try {
    const adminExists = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });
    if (adminExists) {
      console.log("Admin already Exists");
      return;
    }
    const name = config.admin_name;
    const email = config.admin_email;
    const password = config.admin_password;

    if (!name || !email || !password) {
      throw new Error("Admin name, email, password missing in env file.");
    }

    const hashPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role: Role.ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });
    console.log("Admin Created : ", admin);
  } catch (error) {
    console.log("Error seeding admin: ", error);
    await prisma.user.delete({
      where: {
        email: config.admin_email,
      },
    });
  }
};
export const seedManager = async () => {
  try {
    const managerExists = await prisma.user.findFirst({
      where: {
        role: Role.MANAGER,
      },
    });
    if (managerExists) {
      console.log("Manager already Exists");
      return;
    }
    const name = config.manager_name;
    const email = config.manager_email;
    const password = config.manager_password;

    if (!name || !email || !password) {
      throw new Error("Manager name, email, password missing in env file.");
    }

    const hashPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const manager = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role: Role.MANAGER,
        needPasswordChange: false,
        emailVerified: true,
      },
    });
    console.log("Manager Created : ", manager);
  } catch (error) {
    console.log("Error seeding manager: ", error);
    await prisma.user.delete({
      where: {
        email: config.manager_email,
      },
    });
  }
};
export const seedOwner = async () => {
  try {
    const ownerExists = await prisma.user.findFirst({
      where: {
        role: Role.OWNER,
      },
    });
    if (ownerExists) {
      console.log("Owner already Exists");
      return;
    }
    const name = config.owner_name;
    const email = config.owner_email;
    const password = config.owner_password;

    if (!name || !email || !password) {
      throw new Error("Owner name, email, password missing in env file.");
    }

    const hashPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    await prisma.$transaction(async (tx) => {
      const ownerUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashPassword,
          role: Role.OWNER,
          needPasswordChange: false,
          emailVerified: true,
        },
      });

      await tx.owner.create({
        data: {
          userId: ownerUser.id,
          name: ownerUser.name,
          email: ownerUser.email,
        },
      });

      console.log("Owner Created successfully: ", ownerUser.email);
    });
  } catch (error) {
    console.log("Error seeding owner: ", error);
    await prisma.user.delete({
      where: {
        email: config.owner_email,
      },
    });
  }
};
