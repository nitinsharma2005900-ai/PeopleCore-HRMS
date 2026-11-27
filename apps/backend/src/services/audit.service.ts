import { db } from '../db';

export class AuditService {
  public static getAuditLogs(query: {
    userId?: string;
    action?: string;
    entityName?: string;
    page?: number;
    limit?: number;
  }) {
    let list = [...db.auditLogs];

    if (query.userId) {
      list = list.filter(l => l.userId === query.userId);
    }
    if (query.action) {
      list = list.filter(l => l.action === query.action);
    }
    if (query.entityName) {
      list = list.filter(l => l.entityName === query.entityName);
    }

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = list.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const startIndex = (page - 1) * limit;

    return {
      logs: list.slice(startIndex, startIndex + limit),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
