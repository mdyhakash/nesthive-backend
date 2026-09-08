import { Role } from "../../../generated/prisma/enums";

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IRegisterTenantPayload {
  name: string;
  email: string;
  password: string;
  tenant: {
    contactNumber?: string;
  };
}

export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface IRequestUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IResetPasswordPayload {
  email: string;
  newPassword: string;
  otp: string;
}
