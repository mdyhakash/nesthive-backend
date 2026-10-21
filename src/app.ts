import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { authRoutes } from "./app/module/auth/auth.route";
import { userRoutes } from "./app/module/user/user.route";
import { ownerRoutes } from "./app/module/owner/owner.route";
import { propertyRoutes } from "./app/module/property/property.route";
import { roomRoutes } from "./app/module/room/room.route";
import { viewingRequestRoutes } from "./app/module/viewingRequest/viewingRequest.route";
import { applicationRoutes } from "./app/module/application/application.route";
import { tenantRoutes } from "./app/module/tenant/tenant.route";
import { roommatePreferenceRoutes } from "./app/module/roommatePreference/roommatePreference.route";
import { leaseRoutes } from "./app/module/lease/lease.route";
import { adminRoutes } from "./app/module/admin/admin.route";
import { paymentRoutes } from "./app/module/payment/payment.route";
import { utilityBillRoutes } from "./app/module/utilityBill/utilityBill.route";
import { maintenanceRoutes } from "./app/module/maintenance/maintenance.route";
import { notificationRoutes } from "./app/module/notification/notification.route";
import { managerRoutes } from "./app/module/manager/manager.route";
import { setupSwagger } from "./app/docs/swagger";

const app: Application = express();

// Initialize Swagger API Documentation
setupSwagger(app);

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/owner", ownerRoutes);
app.use("/api/v1/property", propertyRoutes);
app.use("/api/v1/room", roomRoutes);
app.use("/api/v1/viewing-request", viewingRequestRoutes);
app.use("/api/v1/application", applicationRoutes);
app.use("/api/v1/lease", leaseRoutes);
app.use("/api/v1/tenant", tenantRoutes);
app.use("/api/v1/roommate-preference", roommatePreferenceRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/utility-bill", utilityBillRoutes);
app.use("/api/v1/maintenance", maintenanceRoutes);
app.use("/api/v1/notification", notificationRoutes);
app.use("/api/v1/manager", managerRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to NestHive Backend",
    docs: "/api-docs",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
