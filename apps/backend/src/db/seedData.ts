import bcrypt from 'bcryptjs';

export const DEPARTMENTS = [
  { id: 'dept-eng', code: 'ENG', name: 'Engineering', description: 'Core Software Development & Infrastructure', managerId: 'EMP003' },
  { id: 'dept-prd', code: 'PRD', name: 'Product Management', description: 'Product Roadmap, UX Design & Strategy', managerId: 'EMP006' },
  { id: 'dept-hr', code: 'HR', name: 'Human Resources', description: 'Talent Acquisition, People Operations & Culture', managerId: 'EMP002' },
  { id: 'dept-fin', code: 'FIN', name: 'Finance & Payroll', description: 'Financial Planning, Audits & Payroll Operations', managerId: 'EMP004' },
  { id: 'dept-ops', code: 'OPS', name: 'Operations', description: 'Facilities, Security & Business Logistics', managerId: 'EMP008' },
  { id: 'dept-cs', code: 'CS', name: 'Customer Success', description: 'Client Support, Onboarding & Advisory', managerId: 'EMP010' }
];

export const SHIFTS = [
  { id: 'shift-gen', code: 'GEN', name: 'General Shift', startTime: '09:00', endTime: '18:00', isOvernight: false, gracePeriodMins: 15, workHours: 8.0, breakHours: 1.0, isActive: true },
  { id: 'shift-morn', code: 'MORN', name: 'Morning Shift', startTime: '06:00', endTime: '15:00', isOvernight: false, gracePeriodMins: 15, workHours: 8.0, breakHours: 1.0, isActive: true },
  { id: 'shift-night', code: 'NIGHT', name: 'Overnight Shift', startTime: '21:00', endTime: '06:00', isOvernight: true, gracePeriodMins: 15, workHours: 8.0, breakHours: 1.0, isActive: true }
];

export const HOLIDAYS = [
  { id: 'hol-1', name: 'New Year Day', date: '2026-01-01', year: 2026, isOptional: false, description: 'National Holiday' },
  { id: 'hol-2', name: 'Republic Day', date: '2026-01-26', year: 2026, isOptional: false, description: 'National Holiday' },
  { id: 'hol-3', name: 'Holi Festival', date: '2026-03-04', year: 2026, isOptional: true, description: 'Festival of Colors' },
  { id: 'hol-4', name: 'Independence Day', date: '2026-08-15', year: 2026, isOptional: false, description: 'National Holiday' },
  { id: 'hol-5', name: 'Gandhi Jayanti', date: '2026-10-02', year: 2026, isOptional: false, description: 'National Holiday' },
  { id: 'hol-6', name: 'Diwali Festival', date: '2026-11-08', year: 2026, isOptional: false, description: 'Festival of Lights' },
  { id: 'hol-7', name: 'Christmas', date: '2026-12-25', year: 2026, isOptional: false, description: 'Christmas Day' }
];

export const LEAVE_TYPES = [
  { id: 'lt-casual', code: 'CASUAL', name: 'Casual Leave', description: 'For personal errands and urgent matters', annualQuota: 12.0, carryForwardMax: 0, isPaid: true, requiresAttachment: false },
  { id: 'lt-sick', code: 'SICK', name: 'Sick Leave', description: 'For medical recovery and health appointments', annualQuota: 10.0, carryForwardMax: 5, isPaid: true, requiresAttachment: true },
  { id: 'lt-earned', code: 'EARNED', name: 'Earned / Privilege Leave', description: 'Annual planned vacation leave', annualQuota: 15.0, carryForwardMax: 15, isPaid: true, requiresAttachment: false },
  { id: 'lt-unpaid', code: 'UNPAID', name: 'Leave Without Pay (LOP)', description: 'Unpaid personal absence', annualQuota: 30.0, carryForwardMax: 0, isPaid: false, requiresAttachment: false },
  { id: 'lt-comp', code: 'COMPENSATORY', name: 'Compensatory Off', description: 'Credited for weekend or holiday work', annualQuota: 6.0, carryForwardMax: 0, isPaid: true, requiresAttachment: false }
];

// Pre-hashed passwords for deterministic, super-fast startup
// Hash for "Admin@12345", "Hr@12345", "Manager@12345", "Payroll@12345", "Employee@12345"
// bcrypt.hashSync("Password@123", 10)
export const DEFAULT_PASSWORD_HASH = "$2b$10$wT0lGqVbIeWknJgBfqvjceB.Wv0W9V6b1q8x4fT3wG9lZ7zXv2Ure";

export interface DemoUserSeed {
  id: string;
  email: string;
  passwordHash: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_OFFICER' | 'PAYROLL_SPECIALIST' | 'ADMINISTRATOR';
  firstName: string;
  lastName: string;
  phone: string;
  employeeId?: string;
}

export const DEMO_USERS: DemoUserSeed[] = [
  {
    id: 'user-admin',
    email: 'admin@peoplecore.local',
    passwordHash: bcrypt.hashSync('Admin@12345', 8),
    role: 'ADMINISTRATOR',
    firstName: 'Devendra',
    lastName: 'Singhania',
    phone: '+91 98765 00001'
  },
  {
    id: 'user-hr',
    email: 'hr@peoplecore.local',
    passwordHash: bcrypt.hashSync('Hr@12345', 8),
    role: 'HR_OFFICER',
    firstName: 'Pooja',
    lastName: 'Kashyap',
    phone: '+91 98765 00002',
    employeeId: 'EMP002'
  },
  {
    id: 'user-manager',
    email: 'manager@peoplecore.local',
    passwordHash: bcrypt.hashSync('Manager@12345', 8),
    role: 'MANAGER',
    firstName: 'Rajesh',
    lastName: 'Malhotra',
    phone: '+91 98765 00003',
    employeeId: 'EMP003'
  },
  {
    id: 'user-payroll',
    email: 'payroll@peoplecore.local',
    passwordHash: bcrypt.hashSync('Payroll@12345', 8),
    role: 'PAYROLL_SPECIALIST',
    firstName: 'Siddharth',
    lastName: 'Nambiar',
    phone: '+91 98765 00004',
    employeeId: 'EMP004'
  },
  {
    id: 'user-employee',
    email: 'employee@peoplecore.local',
    passwordHash: bcrypt.hashSync('Employee@12345', 8),
    role: 'EMPLOYEE',
    firstName: 'Aarav',
    lastName: 'Gupta',
    phone: '+91 98765 00005',
    employeeId: 'EMP005'
  }
];

// Generate 50 realistic employees
const FIRST_NAMES = ['Aarav', 'Pooja', 'Rajesh', 'Siddharth', 'Aditi', 'Vikram', 'Ananya', 'Rohan', 'Sneha', 'Karan', 'Meera', 'Varun', 'Neha', 'Arjun', 'Isha', 'Nikhil', 'Tanvi', 'Kabir', 'Divya', 'Manish', 'Rhea', 'Gaurav', 'Tara', 'Sameer', 'Shreya', 'Deepak', 'Kavita', 'Aditya', 'Swati', 'Harsh', 'Preeti', 'Pranav', 'Ritu', 'Abhishek', 'Pallavi', 'Yash', 'Shruti', 'Kunal', 'Jyoti', 'Tarun', 'Anushka', 'Sachin', 'Bhavna', 'Mayank', 'Geeta', 'Sanjay', 'Sunita', 'Akash', 'Komal', 'Alok'];
const LAST_NAMES = ['Gupta', 'Kashyap', 'Malhotra', 'Nambiar', 'Sharma', 'Verma', 'Patel', 'Deshmukh', 'Reddy', 'Iyer', 'Bose', 'Chopra', 'Joshi', 'Mehta', 'Kulkarni', 'Bhatia', 'Menon', 'Pillai', 'Rao', 'Nair', 'Trivedi', 'Saxena', 'Pandey', 'Mishra', 'Kapoor', 'Agrawal', 'Soni', 'Bhardwaj', 'Dubey', 'Goyal', 'Bansal', 'Thakur', 'Chauhan', 'Yadav', 'Singh', 'Sen', 'Dutta', 'Ghosh', 'Chatterjee', 'Banerjee', 'Roy', 'Mukherjee', 'Das', 'Basu', 'Majumdar', 'Sanyal', 'Mitra', 'Som', 'Chakraborty', 'Paul'];

const DESIGNATIONS = [
  'Senior Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'DevOps Specialist', 'QA Automation Engineer',
  'Product Manager', 'UX/UI Designer', 'HR Business Partner', 'Payroll Specialist', 'Financial Analyst',
  'Operations Coordinator', 'Customer Support Specialist', 'Staff Software Engineer', 'Engineering Manager'
];

export function generate50Employees(): any[] {
  const employees: any[] = [];
  const baseSalaryTiers = [45000, 55000, 70000, 85000, 110000, 135000, 160000];

  for (let i = 1; i <= 50; i++) {
    const empId = `EMP${i.toString().padStart(3, '0')}`;
    const fName = FIRST_NAMES[i - 1] || `Employee${i}`;
    const lName = LAST_NAMES[i - 1] || `Surname${i}`;
    const dept = DEPARTMENTS[(i - 1) % DEPARTMENTS.length];
    const designation = DESIGNATIONS[(i - 1) % DESIGNATIONS.length];
    
    // Status distribution
    let status = 'ACTIVE';
    if (i === 48) status = 'ONBOARDING';
    if (i === 49) status = 'NOTICE_PERIOD';
    if (i === 50) status = 'RESIGNED';

    const baseSalary = baseSalaryTiers[(i - 1) % baseSalaryTiers.length];
    const hra = Math.round(baseSalary * 0.4);
    const special = Math.round(baseSalary * 0.2);

    employees.push({
      id: `emp-id-${empId.toLowerCase()}`,
      employeeId: empId,
      userId: i <= 5 ? DEMO_USERS[i - 1].id : `user-${empId.toLowerCase()}`,
      departmentId: dept.id,
      designation: designation,
      joiningDate: new Date(2023, (i % 12), (i % 28) + 1).toISOString(),
      exitDate: status === 'RESIGNED' ? new Date(2026, 10, 15).toISOString() : null,
      employmentStatus: status,
      employmentType: 'FULL_TIME',
      reportingManagerId: i <= 3 ? null : 'EMP003',
      personalEmail: `${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`,
      phone: `+91 98765 ${i.toString().padStart(5, '0')}`,
      emergencyContact: `+91 91234 ${i.toString().padStart(5, '0')}`,
      bloodGroup: ['O+', 'A+', 'B+', 'AB+'][i % 4],
      dateOfBirth: new Date(1992, (i % 12), (i % 25) + 1).toISOString(),
      gender: i % 2 === 0 ? 'Female' : 'Male',
      address: `${100 + i}, Tech Vista Residency, Silicon Avenue, Sector 5, Bangalore`,
      panNumber: `ABCDE${(1000 + i)}F`,
      bankAccountNumber: `98765432${i.toString().padStart(4, '0')}`,
      bankIfscCode: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd',
      firstName: fName,
      lastName: lName,
      userEmail: i <= 5 ? DEMO_USERS[i - 1].email : `${fName.toLowerCase()}.${lName.toLowerCase()}@peoplecore.local`,
      salaryProfile: {
        baseSalaryMonthly: baseSalary.toFixed(2),
        hraMonthly: hra.toFixed(2),
        specialAllowance: special.toFixed(2),
        pfOptIn: true,
        tdsPercentage: baseSalary > 100000 ? '15.00' : '10.00'
      }
    });
  }

  return employees;
}
