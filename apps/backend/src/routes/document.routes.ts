import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/document.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.get('/', authenticate, (req: Request, res: Response): void => {
  let empId: string | undefined = undefined;
  if (req.user!.role === 'EMPLOYEE') {
    empId = req.user!.employeeId;
  } else if (req.query.employeeId) {
    empId = req.query.employeeId as string;
  }

  const docs = DocumentService.getDocuments({
    employeeId: empId,
    category: req.query.category as string
  });
  res.json({ success: true, data: docs });
});

router.post('/upload', authenticate, upload.single('file'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'File attachment is required' });
      return;
    }

    const empId = req.body.employeeId || req.user!.employeeId;
    if (!['HR_OFFICER', 'ADMINISTRATOR'].includes(req.user!.role) && empId !== req.user!.employeeId) {
      res.status(403).json({ success: false, error: 'You can upload documents only for yourself' });
      return;
    }
    if (!empId) {
      res.status(400).json({ success: false, error: 'Employee ID is required' });
      return;
    }

    const doc = DocumentService.uploadDocument({
      employeeId: empId,
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'OTHER',
      fileName: req.file.originalname,
      fileMimeType: req.file.mimetype,
      fileBuffer: req.file.buffer,
      uploadedBy: `${req.user!.firstName} ${req.user!.lastName} (${req.user!.role})`,
      isConfidential: req.body.isConfidential === 'true' || req.body.isConfidential === true
    });

    const { encryptedData, ...safe } = doc;
    res.status(201).json({ success: true, message: 'Document uploaded securely', data: safe });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const result = DocumentService.deleteDocument(req.params.id, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.get('/:id/download', authenticate, (req, res) => {
  try { const file = DocumentService.downloadDocument(req.params.id); res.setHeader('Content-Type', file.contentType); res.setHeader('Cache-Control', 'private, no-store'); res.attachment(file.filename).send(file.bytes); }
  catch (error: any) { res.status(404).json({ success: false, error: error.message }); }
});
export default router;
