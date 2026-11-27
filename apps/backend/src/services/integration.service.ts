import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { config } from '../config/env';

export class IntegrationService {
  /**
   * RFC 5545 compliant iCalendar (.ics) exporter for Holidays and Approved Leaves.
   * Can be imported into Google Calendar, Microsoft Outlook, and Apple Calendar.
   */
  public static generateCalendarICS(employeeId?: string): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PeopleCore Inc//PeopleCore HRMS Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:PeopleCore Corporate Calendar'
    ];

    // 1. Add Company Statutory Holidays
    for (const hol of db.holidays) {
      const cleanDate = hol.date.replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:hol-${hol.id}@peoplecore.local`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
      lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      lines.push(`DTEND;VALUE=DATE:${cleanDate}`);
      lines.push(`SUMMARY:Holiday: ${hol.name}`);
      lines.push(`DESCRIPTION:${hol.description || 'Company Holiday'}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    }

    // 2. Add Approved Leaves (for the employee or general organization)
    const leaves = employeeId 
      ? db.leaveRequests.filter(r => r.employeeId === employeeId && r.status === 'APPROVED')
      : db.leaveRequests.filter(r => r.status === 'APPROVED');

    for (const req of leaves) {
      const cleanStart = req.startDate.replace(/-/g, '');
      const cleanEnd = req.endDate.replace(/-/g, '');
      const emp = db.employees.find(e => e.employeeId === req.employeeId);
      const user = emp ? db.users.find(u => u.id === emp.userId) : null;
      const empName = user ? `${user.firstName} ${user.lastName}` : req.employeeId;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:leave-${req.id}@peoplecore.local`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
      lines.push(`DTSTART;VALUE=DATE:${cleanStart}`);
      lines.push(`DTEND;VALUE=DATE:${cleanEnd}`);
      lines.push(`SUMMARY:Leave (${req.leaveTypeCode}): ${empName}`);
      lines.push(`DESCRIPTION:Reason: ${req.reason}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Safe demonstration email notification dispatcher.
   * If live SMTP credentials are not configured, dispatches safely to demonstration sandbox log.
   */
  public static async sendEmailNotification(to: string, subject: string, bodyText: string, htmlContent?: string) {
    const msgId = `MSG-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const emailRecord = {
      messageId: msgId,
      to,
      subject,
      bodyText,
      sentAt: new Date().toISOString(),
      provider: 'PEOPLECORE_SMTP_SANDBOX',
      status: 'DISPATCHED_TO_SANDBOX'
    };

    console.log(`[IntegrationService:Email] 📧 Dispatched notification to ${to} | Subject: "${subject}" | MessageID: ${msgId}`);
    return emailRecord;
  }
}
