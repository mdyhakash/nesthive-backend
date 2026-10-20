-- AlterTable
ALTER TABLE "properties" ADD COLUMN "managerId" TEXT;

-- CreateIndex
CREATE INDEX "idx_property_manager" ON "properties"("managerId");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
