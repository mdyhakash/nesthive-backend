import type {
  MaintenancePriority,
  MaintenanceStatus,
} from "../../../generated/prisma/enums";

export interface ICreateMaintenancePayload {
  roomId: string;
  title: string;
  description: string;
  priority?: MaintenancePriority;
}

export interface IUpdateMaintenanceStatusPayload {
  status: MaintenanceStatus;
  resolutionNote?: string;
  assignedTo?: string;
}
