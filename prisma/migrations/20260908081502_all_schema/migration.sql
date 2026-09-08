-- CreateEnum
CREATE TYPE "OwnerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'HOSTEL');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'SHARED');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('ACTIVE', 'MOVED_OUT');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'RENT', 'UTILITY');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('BKASH', 'SSLCOMMERZ', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNSETTLED', 'SETTLED');

-- CreateEnum
CREATE TYPE "BillSplitStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OWNER_KYC', 'PROPERTY_IMAGE', 'ROOM_IMAGE', 'LEASE_AGREEMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_UPDATE', 'VIEWING_UPDATE', 'PAYMENT_UPDATE', 'LEASE_UPDATE', 'MAINTENANCE_UPDATE', 'SYSTEM');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDeadline" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "propertyId" TEXT,
    "roomId" TEXT,
    "leaseId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "rentAmount" DECIMAL(10,2) NOT NULL,
    "securityDeposit" DECIMAL(10,2) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "agreementUrl" TEXT,
    "agreementPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "applicationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolutionNote" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "nidNumber" TEXT,
    "verificationStatus" "OwnerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "kycDocumentUrl" TEXT,
    "kycDocumentPublicId" TEXT,
    "additionalFiles" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "paymentGateway" "PaymentGateway" NOT NULL DEFAULT 'BKASH',
    "merchantInvoiceNumber" TEXT NOT NULL,
    "bkashPaymentId" TEXT,
    "bkashTrxId" TEXT,
    "payerReference" TEXT,
    "paidAt" TEXT,
    "gatewayResponse" JSONB,
    "refundTrxId" TEXT,
    "refundAmount" DECIMAL(10,2),
    "refundReason" TEXT,
    "refundedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leaseId" TEXT,
    "applicationId" TEXT,
    "utilityBillSplitId" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "amenities" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL DEFAULT 'SINGLE',
    "rentAmount" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "occupantCount" INTEGER NOT NULL DEFAULT 0,
    "availableFrom" TIMESTAMP(3),
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_occupants" (
    "id" TEXT NOT NULL,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "moveOutDate" TIMESTAMP(3),
    "status" "OccupancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "room_occupants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roommate_preferences" (
    "id" TEXT NOT NULL,
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "preferredArea" TEXT,
    "moveInDate" TIMESTAMP(3),
    "lifestyleTags" TEXT[],
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "roommate_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "splitType" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "status" "BillStatus" NOT NULL DEFAULT 'UNSETTLED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bill_splits" (
    "id" TEXT NOT NULL,
    "shareAmount" DECIMAL(10,2) NOT NULL,
    "status" "BillSplitStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "utilityBillId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "utility_bill_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_requests" (
    "id" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "status" "ViewingStatus" NOT NULL DEFAULT 'PENDING',
    "ownerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "viewing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_application_room_status" ON "applications"("roomId", "status");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "idx_document_type" ON "documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "leases_applicationId_key" ON "leases"("applicationId");

-- CreateIndex
CREATE INDEX "idx_lease_tenant_status" ON "leases"("tenantId", "status");

-- CreateIndex
CREATE INDEX "idx_lease_room_status" ON "leases"("roomId", "status");

-- CreateIndex
CREATE INDEX "idx_maintenance_room_status" ON "maintenance_requests"("roomId", "status");

-- CreateIndex
CREATE INDEX "idx_notification_user_read" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "owners_email_key" ON "owners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "owners_userId_key" ON "owners"("userId");

-- CreateIndex
CREATE INDEX "idx_owner_email" ON "owners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchantInvoiceNumber_key" ON "payments"("merchantInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bkashPaymentId_key" ON "payments"("bkashPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_utilityBillSplitId_key" ON "payments"("utilityBillSplitId");

-- CreateIndex
CREATE INDEX "idx_payment_tenant_type_status" ON "payments"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "idx_property_location" ON "properties"("city", "area");

-- CreateIndex
CREATE INDEX "idx_property_status" ON "properties"("status");

-- CreateIndex
CREATE INDEX "idx_room_status_rent" ON "rooms"("status", "rentAmount");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_propertyId_roomNumber_key" ON "rooms"("propertyId", "roomNumber");

-- CreateIndex
CREATE INDEX "idx_occupant_room_status" ON "room_occupants"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "room_occupants_roomId_tenantId_moveInDate_key" ON "room_occupants"("roomId", "tenantId", "moveInDate");

-- CreateIndex
CREATE UNIQUE INDEX "roommate_preferences_tenantId_key" ON "roommate_preferences"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "utility_bills_roomId_month_key" ON "utility_bills"("roomId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "utility_bill_splits_utilityBillId_tenantId_key" ON "utility_bill_splits"("utilityBillId", "tenantId");

-- CreateIndex
CREATE INDEX "idx_viewing_room_status" ON "viewing_requests"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "viewing_requests_roomId_tenantId_requestedAt_key" ON "viewing_requests"("roomId", "tenantId", "requestedAt");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_utilityBillSplitId_fkey" FOREIGN KEY ("utilityBillSplitId") REFERENCES "utility_bill_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_occupants" ADD CONSTRAINT "room_occupants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_occupants" ADD CONSTRAINT "room_occupants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_preferences" ADD CONSTRAINT "roommate_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bill_splits" ADD CONSTRAINT "utility_bill_splits_utilityBillId_fkey" FOREIGN KEY ("utilityBillId") REFERENCES "utility_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bill_splits" ADD CONSTRAINT "utility_bill_splits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
