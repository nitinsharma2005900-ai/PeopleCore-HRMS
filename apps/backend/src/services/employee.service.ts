import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { AuthenticatedUser } from '../types';

export class EmployeeService {
  public static getEmployees(query: {
    search?: string;
    departmentId?: string;
    employmentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    let list = [...db.employees];

    if (query.departmentId) {
      list = list.filter(e => e.departmentId === query.departmentId);
    }

    if (query.employmentStatus) {
      list = list.filter(e => e.employmentStatus === query.employmentStatus);
    }

    if (query.search) {
      const q = query.search.toLowerCase().trim();
      list = list.filter(e => {
        const u = db.users.find(usr => usr.id === e.userId);
        const nameMatch = u ? `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) : false;
        const idMatch = e.employeeId.toLowerCase().includes(q);
        const emailMatch = e.personalEmail ? e.personalEmail.toLowerCase().includes(q) : false;
        const desigMatch = e.designation ? e.designation.toLowerCase().includes(q) : false;
        return nameMatch || idMatch || emailMatch || desigMatch;
      });
    }

    const total = list.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 15);
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    const data = paginated.map(e => {
      const user = db.users.find(u => u.id === e.userId);
      const dept = db.departments.find(d => d.id === e.departmentId);
      const mgr = e.reportingManagerId ? db.employees.find(m => m.employeeId === e.reportingManagerId) : null;
      const mgrUser = mgr ? db.users.find(u => u.id === mgr.userId) : null;

      return {
        id: e.id,
        employeeId: e.employeeId,
        name: user ? `${user.firstName} ${user.lastName}` : e.employeeId,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || e.personalEmail,
        department: dept ? dept.name : 'General',
        departmentId: e.departmentId,
        designation: e.designation,
        joiningDate: e.joiningDate,
        employmentStatus: e.employmentStatus,
        employmentType: e.employmentType,
        reportingManager: mgrUser ? `${mgrUser.firstName} ${mgrUser.lastName}` : (e.reportingManagerId || 'None'),
        phone: e.phone || user?.phone,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName || 'E'}`
      };
    });

    return {
      employees: data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public static getEmployeeById(idOrEmpId: string, requester: AuthenticatedUser) {
    const emp = db.employees.find(e => e.id === idOrEmpId || e.employeeId === idOrEmpId);
    if (!emp) {
      throw new Error(`Employee with ID ${idOrEmpId} not found`);
    }

    const user = db.users.find(u => u.id === emp.userId);
    const dept = db.departments.find(d => d.id === emp.departmentId);
    const mgr = emp.reportingManagerId ? db.employees.find(m => m.employeeId === emp.reportingManagerId) : null;
    const mgrUser = mgr ? db.users.find(u => u.id === mgr.userId) : null;

    // Least-privilege salary access rule:
    // Only PAYROLL_SPECIALIST or the employee themselves can see salaryProfile
    const canViewSalary = requester.role === 'PAYROLL_SPECIALIST' || requester.employeeId === emp.employeeId;
    const salary = canViewSalary ? db.salaryProfiles.find(s => s.employeeId === emp.employeeId) : null;

    const documents = db.employeeDocuments
      .filter(d => d.employeeId === emp.employeeId)
      .map(d => ({
        id: d.id,
        title: d.title,
        category: d.category,
        fileName: d.fileName,
        fileSize: d.fileSize,
        uploadedBy: d.uploadedBy,
        createdAt: d.createdAt
      }));

    const safeEmployee = { ...emp };
    if (!canViewSalary) for (const key of ['bankAccountNumber', 'bankIfscCode', 'bankName', 'panNumber', 'address', 'emergencyContact']) delete safeEmployee[key];
    return {
      ...safeEmployee,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      departmentName: dept?.name || 'General',
      reportingManagerName: mgrUser ? `${mgrUser.firstName} ${mgrUser.lastName}` : 'None',
      salaryProfile: salary || (canViewSalary ? null : { restricted: true, reason: 'Confidential: Accessible only to Payroll Specialists or Employee Owner' }),
      documents
    };
  }

  public static createEmployee(data: any, actorId: string) {
    z.object({ firstName: z.string().min(1).max(100), lastName: z.string().min(1).max(100), email: z.string().email(), designation: z.string().min(1).optional(), joiningDate: z.string().refine(v => !isNaN(Date.parse(v))).optional() }).parse(data);
    if (db.users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) throw new Error('Email already registered');
    if (data.departmentId && !db.departments.some(d => d.id === data.departmentId)) throw new Error('Unknown department');
    // Generate next sequential EMP ID
    const maxNum = db.employees.reduce((max, e) => {
      const n = parseInt(e.employeeId.replace('EMP', ''), 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    const nextEmpId = `EMP${(maxNum + 1).toString().padStart(3, '0')}`;

    // Create User account
    const userId = uuidv4();
    const newUser = {
      id: userId,
      email: data.email || `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@peoplecore.local`,
      passwordHash: db.users[4].passwordHash, // default Employee@12345
      role: (data.role || 'EMPLOYEE') as any,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || '',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);

    const newEmp = {
      id: uuidv4(),
      employeeId: nextEmpId,
      userId,
      departmentId: data.departmentId || 'dept-eng',
      designation: data.designation || 'Software Engineer',
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString() : new Date().toISOString(),
      exitDate: null,
      employmentStatus: (data.employmentStatus || 'ONBOARDING') as any,
      employmentType: (data.employmentType || 'FULL_TIME') as any,
      reportingManagerId: data.reportingManagerId || 'EMP003',
      personalEmail: data.personalEmail || data.email,
      phone: data.phone || '',
      emergencyContact: data.emergencyContact || '',
      bloodGroup: data.bloodGroup || 'O+',
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
      gender: data.gender || 'Not Specified',
      address: data.address || '',
      panNumber: data.panNumber || `ABCDE${maxNum + 1}F`,
      bankAccountNumber: data.bankAccountNumber || `98765432${(maxNum + 1).toString().padStart(4, '0')}`,
      bankIfscCode: data.bankIfscCode || 'HDFC0001234',
      bankName: data.bankName || 'HDFC Bank Ltd',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.employees.push(newEmp);

    // Initial Salary Profile
    const baseSal = parseFloat(data.baseSalaryMonthly || '50000');
    db.salaryProfiles.push({
      id: uuidv4(),
      employeeId: nextEmpId,
      baseSalaryMonthly: baseSal.toFixed(2),
      hraMonthly: (baseSal * 0.4).toFixed(2),
      specialAllowance: (baseSal * 0.2).toFixed(2),
      pfOptIn: true,
      tdsPercentage: '10.00',
      effectiveFrom: newEmp.joiningDate,
      createdAt: new Date().toISOString()
    });

    // Seed Leave Balances for 2026
    for (const lt of db.leaveTypes) {
      db.leaveBalances.push({
        id: uuidv4(),
        employeeId: nextEmpId,
        leaveTypeId: lt.id,
        leaveTypeCode: lt.code,
        year: 2026,
        allocated: lt.annualQuota,
        used: 0,
        pending: 0,
        remaining: lt.annualQuota,
        carriedForward: 0
      });
    }

    // Audit log
    db.auditLogs.push({
      id: uuidv4(),
      userId: actorId,
      action: 'EMPLOYEE_CREATED',
      entityName: 'Employee',
      entityId: nextEmpId,
      previousStateJson: null,
      newStateJson: { employeeId: nextEmpId, name: `${data.firstName} ${data.lastName}`, departmentId: newEmp.departmentId },
      createdAt: new Date().toISOString()
    });

    db.save();

    return {
      success: true,
      employee: newEmp,
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    };
  }

  public static updateEmployee(empId: string, data: any, actorId: string) {
    const emp = db.employees.find(e => e.id === empId || e.employeeId === empId);
    if (!emp) {
      throw new Error(`Employee with ID ${empId} not found`);
    }

    const prevState = { ...emp };

    if (data.departmentId) emp.departmentId = data.departmentId;
    if (data.designation) emp.designation = data.designation;
    if (data.employmentStatus) emp.employmentStatus = data.employmentStatus;
    if (data.employmentType) emp.employmentType = data.employmentType;
    if (data.reportingManagerId !== undefined) emp.reportingManagerId = data.reportingManagerId;
    if (data.phone) emp.phone = data.phone;
    if (data.address) emp.address = data.address;
    if (data.emergencyContact) emp.emergencyContact = data.emergencyContact;
    if (data.exitDate) emp.exitDate = new Date(data.exitDate).toISOString();

    emp.updatedAt = new Date().toISOString();

    // Update User name if provided
    const user = db.users.find(u => u.id === emp.userId);
    if (user) {
      if (data.firstName) user.firstName = data.firstName;
      if (data.lastName) user.lastName = data.lastName;
      if (data.phone) user.phone = data.phone;
    }

    // Update Salary if provided and authorized
    if (data.baseSalaryMonthly) {
      const sal = db.salaryProfiles.find(s => s.employeeId === emp.employeeId);
      if (sal) {
        const base = parseFloat(data.baseSalaryMonthly);
        sal.baseSalaryMonthly = base.toFixed(2);
        sal.hraMonthly = (base * 0.4).toFixed(2);
        sal.specialAllowance = (base * 0.2).toFixed(2);
      }
    }

    db.auditLogs.push({
      id: uuidv4(),
      userId: actorId,
      action: 'EMPLOYEE_UPDATED',
      entityName: 'Employee',
      entityId: emp.employeeId,
      previousStateJson: prevState,
      newStateJson: emp,
      createdAt: new Date().toISOString()
    });

    db.save();
    return emp;
  }

  public static exportEmployeesCsv(): string {
    const headers = ['EmployeeID', 'FirstName', 'LastName', 'Email', 'Department', 'Designation', 'Status', 'JoiningDate', 'Phone'];
    const rows = db.employees.map(e => {
      const u = db.users.find(usr => usr.id === e.userId);
      const d = db.departments.find(dept => dept.id === e.departmentId);
      return [
        e.employeeId,
        u?.firstName || '',
        u?.lastName || '',
        u?.email || e.personalEmail || '',
        d?.name || '',
        `"${e.designation}"`,
        e.employmentStatus,
        e.joiningDate.slice(0, 10),
        `"${e.phone || ''}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
