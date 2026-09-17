export interface ICreateApplication {
  roomId: string;
}

export interface IUpdateApplicationStatus {
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  paymentDeadline?: Date;
}
