export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_OFFICER' | 'PAYROLL_SPECIALIST' | 'ADMINISTRATOR';

export type EmploymentStatus = 'ACTIVE' | 'ONBOARDING' | 'NOTICE_PERIOD' | 'RESIGNED' | 'TERMINATED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF';

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type LeaveCode = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'COMPENSATORY';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type PayrollStatus = 'DRAFT' | 'CALCULATING' | 'REVIEW_PENDING' | 'FINALIZED' | 'CANCELLED';

export type ReviewStatus = 'GOAL_SETTING' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED' | 'ACKNOWLEDGED';

export type DocumentCategory = 'ID_PROOF' | 'EDUCATIONAL' | 'OFFER_LETTER' | 'TAX_RECORD' | 'CONTRACT' | 'MEDICAL' | 'OTHER';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  employeeId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: any;
  };
}
