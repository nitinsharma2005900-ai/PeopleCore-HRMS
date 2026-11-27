import axios from 'axios';
import { config } from '../config/env';

export class PythonServiceClient {
  static async call(service: 'payroll' | 'analytics', path: string, payload: any) {
    const base = service === 'payroll' ? config.services.payrollUrl : config.services.analyticsUrl;
    try {
      const response = await axios.post(new URL(`api/v1/${path}`, base.replace(/\/?$/, '/')).toString(), payload, {
        timeout: 60000, headers: { 'X-Internal-Token': config.services.internalToken }
      });
      return response.data;
    } catch {
      throw Object.assign(new Error(`${service} service unavailable. No substitute calculation or PDF was created.`), { statusCode: 503 });
    }
  }
  static calculateBatchPayroll(items: any[]) { return this.call('payroll', 'payroll/calculate-batch', { items }); }
  static generatePayslipPDF(payload: any) { return this.call('payroll', 'payroll/payslip/generate', payload); }
  static generatePayslipsPDF(items: any[]) { return this.call('payroll', 'payroll/payslip/generate-batch', { items }); }
  static getWorkforceSummary(employees: any[]) { return this.call('analytics', 'analytics/workforce-summary', { employees }); }
}
