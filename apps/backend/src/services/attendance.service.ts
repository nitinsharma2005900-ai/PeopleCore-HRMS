import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { config } from '../config/env';
const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: config.organization.timezone }).format(date);
import { AttendanceStatus } from '../types';

export class AttendanceService {
  public static checkIn(employeeId: string, shiftId: string = 'shift-gen', source: string = 'WEB') {
    const today = localDate();
    const now = new Date();

    // Prevent duplicate check-in for the same date
    const existing = db.attendanceEvents.find(a => a.employeeId === employeeId && a.date === today);
    if (existing && existing.checkInTime) {
      throw new Error(`Employee ${employeeId} has already checked in today at ${existing.checkInTime}`);
    }

    const shift = db.shifts.find(s => s.id === shiftId) || db.shifts[0];
    const shiftStartHour = parseInt(shift.startTime.split(':')[0], 10);
    const shiftStartMin = parseInt(shift.startTime.split(':')[1], 10);
    
    // Check late arrival
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: config.organization.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':').map(Number);
    const currentMins = local[0] * 60 + local[1];
    const scheduledStartMins = shiftStartHour * 60 + shiftStartMin;
    const graceMins = shift.gracePeriodMins || 15;

    let status: AttendanceStatus = 'PRESENT';
    let lateMins = 0;

    if (currentMins > scheduledStartMins + graceMins) {
      status = 'LATE';
      lateMins = currentMins - scheduledStartMins;
    }

    if (existing) {
      existing.checkInTime = now.toISOString();
      existing.status = status;
      existing.lateMinutes = lateMins;
      existing.shiftId = shift.id;
      existing.source = source;
      db.save();
      return existing;
    }

    const newEvent = {
      id: uuidv4(),
      employeeId,
      shiftId: shift.id,
      date: today,
      checkInTime: now.toISOString(),
      checkOutTime: null,
      totalWorkMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes: lateMins,
      status,
      isOvernight: shift.isOvernight,
      source
    };

    db.attendanceEvents.push(newEvent);
    db.save();
    return newEvent;
  }

  public static checkOut(employeeId: string) {
    const today = localDate();
    const now = new Date();

    const existing = db.attendanceEvents.find(a => a.employeeId === employeeId && a.checkInTime && !a.checkOutTime && now.getTime() - Date.parse(a.checkInTime) < 24 * 3600000);
    if (!existing || !existing.checkInTime) {
      throw new Error(`No active check-in event found for employee ${employeeId} today. Please check in first.`);
    }

    existing.checkOutTime = now.toISOString();

    // Calculate total work minutes
    const checkIn = new Date(existing.checkInTime);
    const diffMs = now.getTime() - checkIn.getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    existing.totalWorkMinutes = totalMinutes;

    // Overtime rule: if worked > 480 minutes (8 hours)
    if (totalMinutes > 480) {
      existing.overtimeMinutes = totalMinutes - 480;
    }

    // Half-day rule: if checked out in less than 4 hours (240 mins)
    if (totalMinutes < 240 && existing.status !== 'ON_LEAVE') {
      existing.status = 'HALF_DAY';
    }

    db.save();
    return existing;
  }

  public static getMonthlyAttendance(employeeId: string, month: number = 11, year: number = 2026) {
    const prefix = `${year}-${month.toString().padStart(2, '0')}`;
    const events = db.attendanceEvents
      .filter(a => a.employeeId === employeeId && a.date.startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDays = events.length;
    const presentCount = events.filter(e => e.status === 'PRESENT').length;
    const lateCount = events.filter(e => e.status === 'LATE').length;
    const absentCount = events.filter(e => e.status === 'ABSENT').length;
    const halfDayCount = events.filter(e => e.status === 'HALF_DAY').length;
    const leaveCount = events.filter(e => e.status === 'ON_LEAVE').length;
    const totalOtMinutes = events.reduce((sum, e) => sum + (e.overtimeMinutes || 0), 0);

    return {
      employeeId,
      month,
      year,
      summary: {
        totalDays,
        presentCount,
        lateCount,
        absentCount,
        halfDayCount,
        leaveCount,
        overtimeHours: parseFloat((totalOtMinutes / 60).toFixed(2)),
        attendanceRate: totalDays > 0 ? parseFloat(((presentCount + lateCount + halfDayCount * 0.5) / totalDays * 100).toFixed(1)) : 100
      },
      events
    };
  }

  public static getTeamAttendance(managerId: string, dateStr: string = localDate()) {
    const subordinates = db.employees.filter(e => e.reportingManagerId === managerId);
    const subIds = subordinates.map(s => s.employeeId);

    const events = db.attendanceEvents.filter(a => subIds.includes(a.employeeId) && a.date === dateStr);

    const team = subordinates.map(s => {
      const u = db.users.find(usr => usr.id === s.userId);
      const ev = events.find(e => e.employeeId === s.employeeId);
      return {
        employeeId: s.employeeId,
        name: u ? `${u.firstName} ${u.lastName}` : s.employeeId,
        designation: s.designation,
        date: dateStr,
        status: ev ? ev.status : 'ABSENT',
        checkInTime: ev?.checkInTime || null,
        checkOutTime: ev?.checkOutTime || null,
        totalWorkMinutes: ev?.totalWorkMinutes || 0,
        lateMinutes: ev?.lateMinutes || 0,
        overtimeMinutes: ev?.overtimeMinutes || 0
      };
    });

    return {
      date: dateStr,
      managerId,
      teamSize: subordinates.length,
      presentToday: team.filter(t => t.status === 'PRESENT' || t.status === 'LATE').length,
      team
    };
  }

  public static requestCorrection(data: {
    employeeId: string;
    date: string;
    proposedCheckIn: string;
    proposedCheckOut: string;
    reason: string;
  }) {
    if (!data.reason?.trim() || !Number.isFinite(Date.parse(data.proposedCheckIn)) || !Number.isFinite(Date.parse(data.proposedCheckOut)) || Date.parse(data.proposedCheckOut) <= Date.parse(data.proposedCheckIn) || Date.parse(data.proposedCheckOut) - Date.parse(data.proposedCheckIn) > 24 * 3600000) throw new Error('Invalid correction times or reason');
    let event = db.attendanceEvents.find(a => a.employeeId === data.employeeId && a.date === data.date);
    if (!event) {
      event = {
        id: uuidv4(),
        employeeId: data.employeeId,
        shiftId: 'shift-gen',
        date: data.date,
        checkInTime: null,
        checkOutTime: null,
        totalWorkMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        status: 'ABSENT',
        isOvernight: false,
        source: 'MANUAL_CORRECTION'
      };
      db.attendanceEvents.push(event);
    }

    const correction = {
      id: uuidv4(),
      attendanceEventId: event.id,
      employeeId: data.employeeId,
      proposedCheckIn: data.proposedCheckIn,
      proposedCheckOut: data.proposedCheckOut,
      reason: data.reason,
      status: 'PENDING',
      reviewedBy: null,
      reviewComments: null,
      createdAt: new Date().toISOString()
    };

    db.attendanceCorrections.push(correction);
    db.save();
    return correction;
  }

  public static reviewCorrection(correctionId: string, action: 'APPROVED' | 'REJECTED', comments: string, reviewerId: string) {
    const corr = db.attendanceCorrections.find(c => c.id === correctionId);
    if (!corr) {
      throw new Error(`Correction ${correctionId} not found`);
    }

    if (corr.status !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(action)) throw new Error('Correction already reviewed or invalid action');
    corr.status = action;
    corr.reviewedBy = reviewerId;
    corr.reviewComments = comments;

    if (action === 'APPROVED') {
      const event = db.attendanceEvents.find(e => e.id === corr.attendanceEventId);
      if (event) {
        event.checkInTime = corr.proposedCheckIn;
        event.checkOutTime = corr.proposedCheckOut;
        event.status = 'PRESENT';
        event.lateMinutes = 0;
        event.totalWorkMinutes = Math.floor((Date.parse(corr.proposedCheckOut) - Date.parse(corr.proposedCheckIn)) / 60000);
        event.overtimeMinutes = Math.max(0, event.totalWorkMinutes - 480);
        event.isOvernight = corr.proposedCheckIn.slice(0, 10) !== corr.proposedCheckOut.slice(0, 10);
        if (event.totalWorkMinutes < 240) event.status = 'HALF_DAY';
      }
    }

    db.save();
    return corr;
  }
}
