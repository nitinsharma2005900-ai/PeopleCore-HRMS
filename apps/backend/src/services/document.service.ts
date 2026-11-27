import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { DocumentCategory } from '../types';

export class DocumentService {
  private static uploadsDir = path.resolve(__dirname, '../../../../storage/uploads');

  public static getDocuments(query: { employeeId?: string; category?: string }) {
    let list = [...db.employeeDocuments];
    if (query.employeeId) {
      list = list.filter(d => d.employeeId === query.employeeId);
    }
    if (query.category) {
      list = list.filter(d => d.category === query.category);
    }
    return list.map(d => {
      const emp = db.employees.find(e => e.employeeId === d.employeeId);
      const user = emp ? db.users.find(u => u.id === emp.userId) : null;
      return {
        ...Object.fromEntries(Object.entries(d).filter(([key]) => key !== 'encryptedData')),
        employeeName: user ? `${user.firstName} ${user.lastName}` : d.employeeId
      };
    });
  }

  public static uploadDocument(data: {
    employeeId: string;
    title: string;
    category: DocumentCategory;
    fileName: string;
    fileMimeType: string;
    fileBuffer: Buffer;
    uploadedBy: string;
    isConfidential?: boolean;
  }) {
    if (!db.employees.some(e => e.employeeId === data.employeeId)) throw new Error('Unknown employee');
    const fileHash = crypto.createHash('sha256').update(data.fileBuffer).digest('hex');
    const key = crypto.createHash('sha256').update(process.env.DOCUMENT_ENCRYPTION_KEY || process.env.INTERNAL_SERVICE_TOKEN || 'test-only').digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(data.fileBuffer), cipher.final()]);
    const encryptedData = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
    const doc = {
      id: uuidv4(),
      employeeId: data.employeeId,
      title: data.title,
      category: data.category,
      fileName: data.fileName,
      fileMimeType: data.fileMimeType,
      fileSize: data.fileBuffer.length,
      filePath: '',
      encryptedData,
      fileHash,
      uploadedBy: data.uploadedBy,
      isConfidential: data.isConfidential ?? true,
      createdAt: new Date().toISOString()
    };

    db.employeeDocuments.push(doc);
    db.save();
    return doc;
  }

  public static downloadDocument(id: string) {
    const document = db.employeeDocuments.find(d => d.id === id);
    if (!document?.encryptedData) throw new Error('No uploaded attachment is available for this document');
    const data = Buffer.from(document.encryptedData, 'base64');
    const key = crypto.createHash('sha256').update(process.env.DOCUMENT_ENCRYPTION_KEY || process.env.INTERNAL_SERVICE_TOKEN || 'test-only').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const bytes = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== document.fileHash) throw new Error('Document integrity check failed');
    return { bytes, filename: path.basename(document.fileName), contentType: document.fileMimeType };
  }

  public static deleteDocument(docId: string, actorId: string) {
    const idx = db.employeeDocuments.findIndex(d => d.id === docId);
    if (idx === -1) throw new Error(`Document ${docId} not found`);

    const doc = db.employeeDocuments[idx];
    db.employeeDocuments.splice(idx, 1);
    db.save();
    return { success: true, message: 'Document deleted successfully' };
  }
}
