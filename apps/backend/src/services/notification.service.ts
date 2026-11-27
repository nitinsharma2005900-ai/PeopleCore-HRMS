import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';

export class NotificationService {
  public static getNotifications(userId: string) {
    return db.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public static markAsRead(notifId: string, userId: string) {
    const notif = db.notifications.find(n => n.id === notifId && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      db.save();
    }
    return notif;
  }

  public static markAllAsRead(userId: string) {
    db.notifications.filter(n => n.userId === userId).forEach(n => n.isRead = true);
    db.save();
    return { success: true };
  }
}
