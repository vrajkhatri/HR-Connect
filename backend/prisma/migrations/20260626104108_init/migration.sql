/*
  Warnings:

  - The values [FULL] on the enum `DayType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `openingBalance` on the `LeaveBalance` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyCredit` on the `LeaveType` table. All the data in the column will be lost.
  - You are about to drop the column `openingBalance` on the `LeaveType` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Notification` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId,leaveTypeId,year]` on the table `LeaveBalance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `EmployeeProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeaveBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeaveType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DayType_new" AS ENUM ('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF');
ALTER TABLE "public"."LeaveRequest" ALTER COLUMN "dayType" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "dayType" TYPE "DayType_new" USING ("dayType"::text::"DayType_new");
ALTER TYPE "DayType" RENAME TO "DayType_old";
ALTER TYPE "DayType_new" RENAME TO "DayType";
DROP TYPE "public"."DayType_old";
ALTER TABLE "LeaveRequest" ALTER COLUMN "dayType" SET DEFAULT 'FULL_DAY';
COMMIT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_leaveRequestId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeProfile" DROP CONSTRAINT "EmployeeProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT "LeaveBalance_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT "LeaveBalance_leaveTypeId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropIndex
DROP INDEX "LeaveBalance_employeeId_leaveTypeId_key";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "designation" DROP NOT NULL,
ALTER COLUMN "joiningDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LeaveBalance" DROP COLUMN "openingBalance",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2026;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dayType" SET DEFAULT 'FULL_DAY',
ALTER COLUMN "reason" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LeaveType" DROP COLUMN "monthlyCredit",
DROP COLUMN "openingBalance",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "maxDays" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "color" SET DEFAULT '#6c757d';

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "status",
ADD COLUMN     "leaveRequestId" INTEGER,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveTypeId_year_key" ON "LeaveBalance"("employeeId", "leaveTypeId", "year");

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
