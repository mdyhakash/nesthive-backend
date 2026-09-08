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
