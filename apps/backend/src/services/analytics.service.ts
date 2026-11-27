import { db } from '../db';
import { PythonServiceClient } from './pythonClient.service';

export class AnalyticsService {
  public static async getWorkforceSummary() {
    return PythonServiceClient.getWorkforceSummary(db.employees);
  }

  public static getDepartmentDistribution() {
    const total = db.employees.length;
    const dist = db.departments.map(dept => {
      const count = db.employees.filter(e => e.departmentId === dept.id).length;
      return {
        department: dept.name,
        code: dept.code,
        headcount: count,
        percentage: total > 0 ? parseFloat((count / total * 100).toFixed(1)) : 0
      };
    });
    return dist.sort((a, b) => b.headcount - a.headcount);
  }

  public static getAttendanceAnalytics(days: number = 30) {
    const activeCount = db.employees.filter(e => e.employmentStatus === 'ACTIVE').length;
    const events = db.attendanceEvents.filter(e => !['WEEKLY_OFF', 'HOLIDAY'].includes(e.status));
    const totalEvents = events.length;

    const present = events.filter(e => e.status === 'PRESENT').length;
    const late = events.filter(e => e.status === 'LATE').length;
    const absent = events.filter(e => e.status === 'ABSENT').length;
    const halfDay = events.filter(e => e.status === 'HALF_DAY').length;
    const onLeave = events.filter(e => e.status === 'ON_LEAVE').length;

    const effectivePresent = present + late + (halfDay * 0.5);
    const attendanceRate = totalEvents > 0 ? parseFloat((effectivePresent / totalEvents * 100).toFixed(1)) : 100;
    
    // Absenteeism formula
    const potentialWorkdays = activeCount * 22;
    const absenteeismRate = potentialWorkdays > 0 ? parseFloat((absent / potentialWorkdays * 100).toFixed(2)) : 0;

    const totalOtMins = events.reduce((sum, e) => sum + (e.overtimeMinutes || 0), 0);

    return {
      totalEvents,
      present,
      late,
      absent,
      halfDay,
      onLeave,
      attendanceRate,
      absenteeismRate,
      totalOvertimeHours: parseFloat((totalOtMins / 60).toFixed(2))
    };
  }

  public static getLeaveUtilization() {
    const requests = db.leaveRequests.filter(r => r.status === 'APPROVED');
    const totalDays = requests.reduce((sum, r) => sum + r.totalDays, 0);

    const byType = db.leaveTypes.map(lt => {
      const days = requests
        .filter(r => r.leaveTypeId === lt.id || r.leaveTypeCode === lt.code)
        .reduce((sum, r) => sum + r.totalDays, 0);
      return {
        leave_type: lt.name,
        code: lt.code,
        days_taken: days,
        percentage: totalDays > 0 ? parseFloat((days / totalDays * 100).toFixed(1)) : 0
      };
    });

    return {
      totalRequests: db.leaveRequests.length,
      approvedRequests: requests.length,
      totalApprovedDays: totalDays,
      byType
    };
  }

  public static getHiringAttritionTrends() {
    // Group employees by joining date month
    const hiresMap: { [k: string]: number } = {};
    for (const emp of db.employees) {
      const m = emp.joiningDate.slice(0, 7);
      hiresMap[m] = (hiresMap[m] || 0) + 1;
    }

    const periods = Object.keys(hiresMap).sort().slice(-12);
    return periods.map(p => ({
      period: p,
      hires: hiresMap[p] || 0,
      exits: db.employees.filter(e => e.exitDate?.slice(0, 7) === p).length,
      net_change: (hiresMap[p] || 0) - db.employees.filter(e => e.exitDate?.slice(0, 7) === p).length
    }));
  }

  public static getPayrollExpenditureSummary() {
    // Only aggregated sums! Never leak individual salaries
    return db.payrollRuns.map(r => {
      const p = db.payrollPeriods.find(period => period.id === r.payrollPeriodId);
      return {
        periodId: r.payrollPeriodId,
        label: p ? `${p.month}/${p.year}` : r.idempotencyKey,
        totalGross: parseFloat(r.totalGross),
        totalDeductions: parseFloat(r.totalDeductions),
        totalNet: parseFloat(r.totalNet),
        status: r.status
      };
    });
  }
}
