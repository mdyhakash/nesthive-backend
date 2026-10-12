import { OwnerVerificationStatus, UserStatus } from "../../../generated/prisma/enums";

export interface IUpdateKycStatusPayload {
  status: OwnerVerificationStatus;
  rejectionReason?: string;
}

export interface IUpdateUserStatusPayload {
  status: UserStatus;
}
