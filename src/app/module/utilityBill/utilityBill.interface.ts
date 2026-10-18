import type { SplitType } from "../../../generated/prisma/enums";

export interface ICustomSplitInput {
  tenantId: string;
  shareAmount: number;
}

export interface ICreateUtilityBillPayload {
  roomId: string;
  month: Date;
  totalAmount: number;
  splitType?: SplitType;
  customSplits?: ICustomSplitInput[];
}
