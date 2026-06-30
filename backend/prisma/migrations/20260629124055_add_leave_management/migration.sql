-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "adjustedBy" INTEGER,
ADD COLUMN     "adjustmentReason" TEXT,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "carryForward" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "carryForwardLimit" DOUBLE PRECISION,
ADD COLUMN     "monthlyCredit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LeaveBalanceHistory" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leavesTaken" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveBalanceHistory_employeeId_year_month_idx" ON "LeaveBalanceHistory"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceHistory_employeeId_leaveTypeId_year_month_key" ON "LeaveBalanceHistory"("employeeId", "leaveTypeId", "year", "month");

-- AddForeignKey
ALTER TABLE "LeaveBalanceHistory" ADD CONSTRAINT "LeaveBalanceHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceHistory" ADD CONSTRAINT "LeaveBalanceHistory_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_adjustedBy_fkey" FOREIGN KEY ("adjustedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
