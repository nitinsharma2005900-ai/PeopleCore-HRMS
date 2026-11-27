import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { ReviewStatus } from '../types';

export class PerformanceService {
  public static getReviews(query: { employeeId?: string; reviewerId?: string }) {
    let list = [...db.performanceReviews];
    if (query.employeeId) {
      list = list.filter(r => r.employeeId === query.employeeId);
    }
    if (query.reviewerId) {
      list = list.filter(r => r.reviewerId === query.reviewerId);
    }

    return list.map(r => {
      const emp = db.employees.find(e => e.employeeId === r.employeeId);
      const empUser = emp ? db.users.find(u => u.id === emp.userId) : null;
      const rev = db.employees.find(e => e.employeeId === r.reviewerId);
      const revUser = rev ? db.users.find(u => u.id === rev.userId) : null;

      return {
        ...r,
        employeeName: empUser ? `${empUser.firstName} ${empUser.lastName}` : r.employeeId,
        reviewerName: revUser ? `${revUser.firstName} ${revUser.lastName}` : r.reviewerId,
        department: emp?.departmentId,
        designation: emp?.designation
      };
    });
  }

  public static createReview(data: {
    employeeId: string;
    reviewerId: string;
    periodTitle: string;
    periodYear: number;
    goals?: Array<{ title: string; weightage: number; description?: string }>;
  }) {
    const reviewId = uuidv4();
    const goals = (data.goals || [
      { title: 'Technical Execution & Code Quality', weightage: 40, description: 'Deliver resilient, production-ready modules' },
      { title: 'Project Ownership & SLA Delivery', weightage: 30, description: 'Meet sprint targets without regressions' },
      { title: 'Mentorship & Knowledge Sharing', weightage: 30, description: 'Review pull requests and author documentation' }
    ]).map((g, idx) => ({
      id: uuidv4(),
      title: g.title,
      weightage: g.weightage,
      status: 'IN_PROGRESS',
      rating: null
    }));

    const newRev = {
      id: reviewId,
      employeeId: data.employeeId,
      reviewerId: data.reviewerId,
      periodTitle: data.periodTitle,
      periodYear: data.periodYear,
      status: 'IN_PROGRESS' as ReviewStatus,
      overallRating: null,
      managerFeedback: null,
      employeeFeedback: null,
      goals,
      submittedAt: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.performanceReviews.push(newRev);
    db.save();
    return newRev;
  }

  public static updateReview(reviewId: string, data: {
    overallRating?: number;
    managerFeedback?: string;
    employeeFeedback?: string;
    status?: ReviewStatus;
    goals?: any[];
  }) {
    const rev = db.performanceReviews.find(r => r.id === reviewId);
    if (!rev) throw new Error(`Review ${reviewId} not found`);

    if (data.overallRating !== undefined) rev.overallRating = data.overallRating;
    if (data.managerFeedback !== undefined) rev.managerFeedback = data.managerFeedback;
    if (data.employeeFeedback !== undefined) rev.employeeFeedback = data.employeeFeedback;
    if (data.status) rev.status = data.status;
    if (data.goals) rev.goals = data.goals;

    if (data.status === 'REVIEWED') {
      rev.reviewedAt = new Date().toISOString();
    } else if (data.status === 'SUBMITTED') {
      rev.submittedAt = new Date().toISOString();
    }

    rev.updatedAt = new Date().toISOString();
    db.save();
    return rev;
  }
}
