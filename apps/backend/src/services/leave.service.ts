import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { LeaveStatus } from '../types';

export class LeaveService {
  public static getBalances(employeeId: string, year: number = 2026) {
    let balances = db.leaveBalances.filter(b => b.employeeId === employeeId && b.year === year);
    if (balances.length === 0) {
      // Initialize balances if not yet created
      for (const lt of db.leaveTypes) {
        balances.push({
          id: uuidv4(),
          employeeId,
          leaveTypeId: lt.id,
          leaveTypeCode: lt.code,
          year,
          allocated: lt.annualQuota,
          used: 0,
          pending: 0,
          remaining: lt.annualQuota,
          carriedForward: 0
        });
      }
      db.leaveBalances.push(...balances);
      db.save();
    }

    return balances.map(b => {
      const lt = db.leaveTypes.find(t => t.id === b.leaveTypeId || t.code === b.leaveTypeCode);
      return {
        ...b,
        name: lt?.name || b.leaveTypeCode,
        description: lt?.description || '',
        isPaid: lt?.isPaid ?? true
      };
    });
  }

  public static getLeaveRequests(query: { employeeId?: string; status?: LeaveStatus }) {
    let requests = [...db.leaveRequests];

    if (query.employeeId) {
      requests = requests.filter(r => r.employeeId === query.employeeId);
    }
    if (query.status) {
      requests = requests.filter(r => r.status === query.status);
    }

    return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => {
      const emp = db.employees.find(e => e.employeeId === r.employeeId);
      const user = emp ? db.users.find(u => u.id === emp.userId) : null;
      const lt = db.leaveTypes.find(t => t.id === r.leaveTypeId || t.code === r.leaveTypeCode);

      return {
        ...r,
        employeeName: user ? `${user.firstName} ${user.lastName}` : r.employeeId,
        department: emp?.departmentId,
        leaveTypeName: lt?.name || r.leaveTypeCode
      };
    });
  }

  public static applyLeave(data: {
    employeeId: string;
    leaveTypeCode: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    if (!data.reason?.trim() || !db.employees.some(e => e.employeeId === data.employeeId)) throw new Error('Employee and reason are required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate || '')) throw new Error('Invalid leave dates');
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid start date or end date format');
    }
    if (start.toISOString().slice(0, 10) !== data.startDate || end.toISOString().slice(0, 10) !== data.endDate || start.getUTCFullYear() !== end.getUTCFullYear() || (end.getTime() - start.getTime()) / 86400000 > 366) throw new Error('Invalid leave date range');
    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }

    // 1. Overlapping leave validation
    const existing = db.leaveRequests.filter(r => 
      r.employeeId === data.employeeId && 
      (r.status === 'PENDING' || r.status === 'APPROVED')
    );

    for (const r of existing) {
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      if (start <= rEnd && end >= rStart) {
        throw new Error(`Overlapping leave request detected: You already have a ${r.status} leave request from ${r.startDate} to ${r.endDate}`);
      }
    }

    // 2. Calculate business working days (excluding weekends and statutory holidays)
    let totalDays = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dayOfWeek = cur.getUTCDay(); // 0 is Sunday, 6 is Saturday
      const dateStr = cur.toISOString().slice(0, 10);
      const isHoliday = db.holidays.some(h => h.date === dateStr);

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
        totalDays += 1;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    if (totalDays === 0) {
      throw new Error('The selected date range falls entirely on weekends or company holidays');
    }

    // 3. Balance verification
    const lt = db.leaveTypes.find(t => t.code === data.leaveTypeCode);
    if (!lt) {
      throw new Error(`Leave type ${data.leaveTypeCode} not recognized`);
    }

    const year = start.getFullYear();
    const balance = db.leaveBalances.find(b => b.employeeId === data.employeeId && b.leaveTypeCode === data.leaveTypeCode && b.year === year);
    
    if (lt.code !== 'UNPAID') {
      if (!balance || balance.remaining - balance.pending < totalDays) {
        throw new Error(`Insufficient leave balance: Requested ${totalDays} days, but remaining balance is ${balance?.remaining || 0} days`);
      }
      balance.pending += totalDays;
    }

    const newReq = {
      id: uuidv4(),
      employeeId: data.employeeId,
      leaveTypeId: lt.id,
      leaveTypeCode: lt.code,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      reason: data.reason,
      status: 'PENDING' as LeaveStatus,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.leaveRequests.push(newReq);

    // Notify manager
    const emp = db.employees.find(e => e.employeeId === data.employeeId);
    if (emp && emp.reportingManagerId) {
      const mgr = db.employees.find(m => m.employeeId === emp.reportingManagerId);
      if (mgr) {
        db.notifications.push({
          id: uuidv4(),
          userId: mgr.userId,
          title: 'New Leave Request Submitted',
          message: `${emp.employeeId} applied for ${totalDays} days ${lt.name}`,
          type: 'ACTION_REQUIRED',
          link: '/leave/approvals',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    db.save();
    return newReq;
  }

  public static reviewLeave(requestId: string, action: 'APPROVED' | 'REJECTED', reviewerId: string, comments?: string) {
    if (!['APPROVED', 'REJECTED'].includes(action)) throw new Error('Invalid review action');
    const req = db.leaveRequests.find(r => r.id === requestId);
    if (!req) {
      throw new Error(`Leave request ${requestId} not found`);
    }
    if (req.status !== 'PENDING') {
      throw new Error(`Leave request is already ${req.status}`);
    }

    const year = new Date(req.startDate).getFullYear();
    const balance = db.leaveBalances.find(b => b.employeeId === req.employeeId && b.leaveTypeCode === req.leaveTypeCode && b.year === year);

    if (action === 'APPROVED') {
      req.status = 'APPROVED';
      // Transactional balance deduction
      if (balance && req.leaveTypeCode !== 'UNPAID') {
        balance.pending = Math.max(0, balance.pending - req.totalDays);
        balance.used += req.totalDays;
        balance.remaining = Math.max(0, balance.allocated - balance.used);
      }

      // Update attendance events for approved dates to ON_LEAVE
      const cur = new Date(req.startDate);
      const end = new Date(req.endDate);
      while (cur <= end) {
        const dStr = cur.toISOString().slice(0, 10);
        if ([0, 6].includes(cur.getUTCDay()) || db.holidays.some(h => h.date === dStr)) { cur.setUTCDate(cur.getUTCDate() + 1); continue; }
        let att = db.attendanceEvents.find(a => a.employeeId === req.employeeId && a.date === dStr);
        if (att) {
          att.previousLeaveStatus = att.status;
          att.status = req.leaveTypeCode === 'UNPAID' ? 'ABSENT' : 'ON_LEAVE';
        } else {
          db.attendanceEvents.push({
            id: uuidv4(),
            employeeId: req.employeeId,
            shiftId: 'shift-gen',
            date: dStr,
            checkInTime: null,
            checkOutTime: null,
            totalWorkMinutes: 0,
            overtimeMinutes: 0,
            lateMinutes: 0,
            status: req.leaveTypeCode === 'UNPAID' ? 'ABSENT' : 'ON_LEAVE',
            isOvernight: false,
            source: 'SYSTEM_APPROVED_LEAVE'
          });
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      req.status = 'REJECTED';
      req.rejectionReason = comments || 'Rejected by approver';
      // Release pending hold
      if (balance && req.leaveTypeCode !== 'UNPAID') {
        balance.pending = Math.max(0, balance.pending - req.totalDays);
      }
    }

    req.updatedAt = new Date().toISOString();

    // Notify employee
    const emp = db.employees.find(e => e.employeeId === req.employeeId);
    if (emp) {
      db.notifications.push({
        id: uuidv4(),
        userId: emp.userId,
        title: `Leave Request ${action}`,
        message: `Your leave request for ${req.totalDays} days (${req.startDate} to ${req.endDate}) has been ${action.toLowerCase()}.`,
        type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        link: '/leave/requests',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    db.save();
    return req;
  }

  public static cancelLeave(requestId: string, employeeId: string) {
    const req = db.leaveRequests.find(r => r.id === requestId && r.employeeId === employeeId);
    if (!req) {
      throw new Error(`Leave request ${requestId} not found for this employee`);
    }

    const year = new Date(req.startDate).getFullYear();
    const balance = db.leaveBalances.find(b => b.employeeId === req.employeeId && b.leaveTypeCode === req.leaveTypeCode && b.year === year);

    if (req.status === 'APPROVED') {
      // Revert used balance
      if (balance && req.leaveTypeCode !== 'UNPAID') {
        balance.used = Math.max(0, balance.used - req.totalDays);
        balance.remaining = balance.allocated - balance.used;
      }
    } else if (req.status === 'PENDING') {
      // Release pending hold
      if (balance && req.leaveTypeCode !== 'UNPAID') {
        balance.pending = Math.max(0, balance.pending - req.totalDays);
      }
    }

    for (const event of db.attendanceEvents.filter(a => a.employeeId === req.employeeId && a.date >= req.startDate && a.date <= req.endDate && a.status === 'ON_LEAVE')) event.status = event.previousLeaveStatus || 'ABSENT';
    req.status = 'CANCELLED';
    req.updatedAt = new Date().toISOString();
    db.save();
    return req;
  }
}
