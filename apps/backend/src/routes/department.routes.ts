import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response): void => {
  const depts = db.departments.map(d => {
    const count = db.employees.filter(e => e.departmentId === d.id).length;
    const mgr = d.managerId ? db.employees.find(m => m.employeeId === d.managerId) : null;
    const mgrUser = mgr ? db.users.find(u => u.id === mgr.userId) : null;
    return {
      ...d,
      headcount: count,
      managerName: mgrUser ? `${mgrUser.firstName} ${mgrUser.lastName}` : (d.managerId || 'Unassigned')
    };
  });
  res.json({ success: true, data: depts });
});

router.post('/', authenticate, requireRole('ADMINISTRATOR', 'HR_OFFICER'), (req: Request, res: Response): void => {
  const { code, name, description, managerId } = req.body;
  if (!code || !name) {
    res.status(400).json({ success: false, error: 'Department code and name are required' });
    return;
  }
  const newDept = {
    id: `dept-${code.toLowerCase()}`,
    code: code.toUpperCase(),
    name,
    description: description || '',
    managerId: managerId || null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.departments.push(newDept);
  db.save();
  res.status(201).json({ success: true, data: newDept });
});

export default router;
