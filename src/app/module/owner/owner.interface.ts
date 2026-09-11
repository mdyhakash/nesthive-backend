export interface ILoginOwnerPayload {
  email: string;
  password: string;
}

export interface IRegisterOwnerPayload {
  name: string;
  email: string;
  password: string;
  owner: {
    contactNumber?: string;
    address?: string;
    nidNumber?: string;
  };
}

export interface IVerifyOwnerEmailPayload {
  email: string;
  otp: string;
}

export interface IKycReviewPayload {
  action: "APPROVE" | "REJECT";
  rejectionReason?: string;
}
