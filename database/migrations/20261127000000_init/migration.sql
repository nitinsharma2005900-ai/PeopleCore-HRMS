-- PeopleCore Enterprise HRMS PostgreSQL Migration
-- Migration: 20261127000000_init

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'PAYROLL_SPECIALIST', 'ADMINISTRATOR');
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN');
CREATE TYPE "OffboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF');
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "LeaveCode" AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID', 'COMPENSATORY');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CALCULATING', 'REVIEW_PENDING', 'FINALIZED', 'CANCELLED');
CREATE TYPE "ReviewStatus" AS ENUM ('GOAL_SETTING', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'ACKNOWLEDGED');
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'EXCEEDED', 'CANCELLED');
CREATE TYPE "DocumentCategory" AS ENUM ('ID_PROOF', 'EDUCATIONAL', 'OFFER_LETTER', 'TAX_RECORD', 'CONTRACT', 'MEDICAL', 'OTHER');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ACTION_REQUIRED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- Users
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

-- RefreshTokens
CREATE TABLE "RefreshToken" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tokenHash" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "family" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "replacedByToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_family_idx" ON "RefreshToken"("family");

-- Departments
CREATE TABLE "Department" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Department_code_idx" ON "Department"("code");

-- Employees
CREATE TABLE "Employee" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT UNIQUE NOT NULL,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "departmentId" TEXT NOT NULL REFERENCES "Department"("id"),
    "designation" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ONBOARDING',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "reportingManagerId" TEXT REFERENCES "Employee"("id"),
    "personalEmail" TEXT,
    "phone" TEXT,
    "emergencyContact" TEXT,
    "bloodGroup" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "panNumber" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "bankName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Employee_employeeId_idx" ON "Employee"("employeeId");
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");
CREATE INDEX "Employee_reportingManagerId_idx" ON "Employee"("reportingManagerId");
CREATE INDEX "Employee_employmentStatus_idx" ON "Employee"("employmentStatus");

-- Onboarding
CREATE TABLE "OnboardingTask" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT
);
CREATE INDEX "OnboardingTask_employeeId_idx" ON "OnboardingTask"("employeeId");

-- Offboarding
CREATE TABLE "OffboardingTask" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "departmentOwner" TEXT NOT NULL,
    "status" "OffboardingStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT
);
CREATE INDEX "OffboardingTask_employeeId_idx" ON "OffboardingTask"("employeeId");

-- Shifts
CREATE TABLE "Shift" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "code" TEXT UNIQUE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isOvernight" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 15,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "breakHours" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "Shift_code_idx" ON "Shift"("code");

-- Shift Assignments
CREATE TABLE "ShiftAssignment" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "shiftId" TEXT NOT NULL REFERENCES "Shift"("id"),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "ShiftAssignment_employeeId_idx" ON "ShiftAssignment"("employeeId");
CREATE INDEX "ShiftAssignment_shiftId_idx" ON "ShiftAssignment"("shiftId");

-- Attendance Events
CREATE TABLE "AttendanceEvent" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "shiftId" TEXT REFERENCES "Shift"("id"),
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "totalWorkMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "isOvernight" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceEvent_employeeId_date_key" UNIQUE ("employeeId", "date")
);
CREATE INDEX "AttendanceEvent_employeeId_idx" ON "AttendanceEvent"("employeeId");
CREATE INDEX "AttendanceEvent_date_idx" ON "AttendanceEvent"("date");
CREATE INDEX "AttendanceEvent_status_idx" ON "AttendanceEvent"("status");

-- Attendance Corrections
CREATE TABLE "AttendanceCorrection" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "attendanceEventId" TEXT NOT NULL REFERENCES "AttendanceEvent"("id") ON DELETE CASCADE,
    "employeeId" TEXT NOT NULL,
    "proposedCheckIn" TIMESTAMP(3),
    "proposedCheckOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewComments" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AttendanceCorrection_attendanceEventId_idx" ON "AttendanceCorrection"("attendanceEventId");
CREATE INDEX "AttendanceCorrection_employeeId_idx" ON "AttendanceCorrection"("employeeId");
CREATE INDEX "AttendanceCorrection_status_idx" ON "AttendanceCorrection"("status");

-- Holidays
CREATE TABLE "Holiday" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "date" DATE UNIQUE NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "year" INTEGER NOT NULL
);
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");
CREATE INDEX "Holiday_year_idx" ON "Holiday"("year");

-- Leave Types
CREATE TABLE "LeaveType" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "code" "LeaveCode" UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "annualQuota" DOUBLE PRECISION NOT NULL,
    "carryForwardMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false
);

-- Leave Balances
CREATE TABLE "LeaveBalance" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "leaveTypeId" TEXT NOT NULL REFERENCES "LeaveType"("id"),
    "year" INTEGER NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL,
    "carriedForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "LeaveBalance_employeeId_leaveTypeId_year_key" UNIQUE ("employeeId", "leaveTypeId", "year")
);
CREATE INDEX "LeaveBalance_employeeId_idx" ON "LeaveBalance"("employeeId");
CREATE INDEX "LeaveBalance_year_idx" ON "LeaveBalance"("year");

-- Leave Requests
CREATE TABLE "LeaveRequest" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "leaveTypeId" TEXT NOT NULL REFERENCES "LeaveType"("id"),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");
CREATE INDEX "LeaveRequest_dates_idx" ON "LeaveRequest"("startDate", "endDate");

-- Leave Approvals
CREATE TABLE "LeaveApproval" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "leaveRequestId" TEXT NOT NULL REFERENCES "LeaveRequest"("id") ON DELETE CASCADE,
    "approverId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 1,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "actionDate" TIMESTAMP(3)
);
CREATE INDEX "LeaveApproval_leaveRequestId_idx" ON "LeaveApproval"("leaveRequestId");

-- Salary Profiles
CREATE TABLE "SalaryProfile" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT UNIQUE NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "baseSalaryMonthly" DECIMAL(12, 2) NOT NULL,
    "hraMonthly" DECIMAL(12, 2) NOT NULL,
    "specialAllowance" DECIMAL(12, 2) NOT NULL,
    "pfOptIn" BOOLEAN NOT NULL DEFAULT true,
    "tdsPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Periods
CREATE TABLE "PayrollPeriod" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalWorkingDays" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollPeriod_month_year_key" UNIQUE ("month", "year")
);
CREATE INDEX "PayrollPeriod_year_month_idx" ON "PayrollPeriod"("year", "month");
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- Payroll Runs
CREATE TABLE "PayrollRun" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "payrollPeriodId" TEXT NOT NULL REFERENCES "PayrollPeriod"("id"),
    "runNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotencyKey" TEXT UNIQUE NOT NULL,
    "calculationSnapshot" JSONB,
    "totalGross" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "executedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PayrollRun_payrollPeriodId_idx" ON "PayrollRun"("payrollPeriodId");
CREATE INDEX "PayrollRun_idempotencyKey_idx" ON "PayrollRun"("idempotencyKey");

-- Payroll Entries
CREATE TABLE "PayrollEntry" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "payrollRunId" TEXT NOT NULL REFERENCES "PayrollRun"("id") ON DELETE CASCADE,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id"),
    "basicSalary" DECIMAL(12, 2) NOT NULL,
    "hra" DECIMAL(12, 2) NOT NULL,
    "specialAllowance" DECIMAL(12, 2) NOT NULL,
    "bonus" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "overtimePay" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "grossEarnings" DECIMAL(12, 2) NOT NULL,
    "pfDeduction" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "taxDeduction" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "unpaidLeaveDeduction" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12, 2) NOT NULL,
    "netSalary" DECIMAL(12, 2) NOT NULL,
    "attendanceDays" DOUBLE PRECISION NOT NULL,
    "paidDays" DOUBLE PRECISION NOT NULL,
    "lopDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "calculationDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollEntry_payrollRunId_employeeId_key" UNIQUE ("payrollRunId", "employeeId")
);
CREATE INDEX "PayrollEntry_employeeId_idx" ON "PayrollEntry"("employeeId");
CREATE INDEX "PayrollEntry_payrollRunId_idx" ON "PayrollEntry"("payrollRunId");

-- Payslips
CREATE TABLE "Payslip" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "payrollEntryId" TEXT UNIQUE NOT NULL REFERENCES "PayrollEntry"("id") ON DELETE CASCADE,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id"),
    "payslipNumber" TEXT UNIQUE NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "grossPay" DECIMAL(12, 2) NOT NULL,
    "totalDeductions" DECIMAL(12, 2) NOT NULL,
    "netPay" DECIMAL(12, 2) NOT NULL,
    "pdfFilePath" TEXT,
    "verificationHash" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");
CREATE INDEX "Payslip_payslipNumber_idx" ON "Payslip"("payslipNumber");

-- Performance Reviews
CREATE TABLE "PerformanceReview" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "reviewerId" TEXT NOT NULL REFERENCES "Employee"("id"),
    "periodTitle" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "overallRating" DOUBLE PRECISION,
    "managerFeedback" TEXT,
    "employeeFeedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");
CREATE INDEX "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");

-- Performance Goals
CREATE TABLE "PerformanceGoal" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "performanceReviewId" TEXT NOT NULL REFERENCES "PerformanceReview"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weightage" INTEGER NOT NULL DEFAULT 20,
    "targetMetric" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "rating" DOUBLE PRECISION
);
CREATE INDEX "PerformanceGoal_performanceReviewId_idx" ON "PerformanceGoal"("performanceReviewId");

-- Employee Documents
CREATE TABLE "EmployeeDocument" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- Notifications
CREATE TABLE "Notification" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- Audit Logs
CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT REFERENCES "User"("id"),
    "action" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT,
    "previousStateJson" JSONB,
    "newStateJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityName_idx" ON "AuditLog"("entityName");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Background Jobs
CREATE TABLE "BackgroundJob" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "jobName" TEXT NOT NULL,
    "queueName" TEXT NOT NULL DEFAULT 'default',
    "payloadJson" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");
CREATE INDEX "BackgroundJob_nextRunAt_idx" ON "BackgroundJob"("nextRunAt");
