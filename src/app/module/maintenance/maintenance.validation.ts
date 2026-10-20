import { z } from "zod";
import {
  MaintenancePriority,
  MaintenanceStatus,
} from "../../../generated/prisma/enums";

const createMaintenanceZodSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.nativeEnum(MaintenancePriority).optional(),
});

const updateMaintenanceStatusZodSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus),
  resolutionNote: z.string().optional(),
  assignedTo: z.string().optional(),
});

export const maintenanceValidation = {
  createMaintenanceZodSchema,
  updateMaintenanceStatusZodSchema,
};
