import { Router, Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response): void => {
  const result = EmployeeService.getEmployees({
    search: req.query.search as string,
    departmentId: req.query.departmentId as string,
    employmentStatus: req.query.employmentStatus as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 15
  });
  res.json({ success: true, data: result.employees, meta: result.meta });
});

router.get('/export/csv', authenticate, requireRole('ADMINISTRATOR', 'HR_OFFICER', 'PAYROLL_SPECIALIST'), (req: Request, res: Response): void => {
  const csv = EmployeeService.exportEmployeesCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="PeopleCore_Employees_Export.csv"');
  res.send(csv);
});

router.get('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const emp = EmployeeService.getEmployeeById(req.params.id, req.user!);
    res.json({ success: true, data: emp });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.post('/', authenticate, requireRole('ADMINISTRATOR', 'HR_OFFICER'), (req: Request, res: Response): void => {
  try {
    const result = EmployeeService.createEmployee(req.body, req.user!.id);
    res.status(201).json({ success: true, data: result.employee, employee: result.employee, user: result.user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', authenticate, requireRole('ADMINISTRATOR', 'HR_OFFICER'), (req: Request, res: Response): void => {
  try {
    const result = EmployeeService.updateEmployee(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
