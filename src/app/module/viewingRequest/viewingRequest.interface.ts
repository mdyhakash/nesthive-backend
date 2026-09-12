export interface ICreateViewingRequest {
  requestedAt: Date;
}

export interface IUpdateViewingRequestStatus {
  status: "APPROVED" | "REJECTED";
  ownerNote?: string;
}
