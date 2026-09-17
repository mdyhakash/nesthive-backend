import { Gender } from "../../../generated/prisma/enums";

export interface IUpdateTenantProfile {
  name?: string;
  contactNumber?: string;
  address?: string;
  gender?: Gender;
  nidNumber?: string;
}
