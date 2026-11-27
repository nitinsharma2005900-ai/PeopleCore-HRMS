import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { config } from '../config/env';
import { AuthenticatedUser, Role } from '../types';

export class AuthService {
  public static async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Find linked employee ID if available
    const employee = db.employees.find(e => e.userId === user.id);
    const employeeId = employee ? employee.employeeId : user.employeeId;

    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: '15m' });
    const family = uuidv4();
    const refreshToken = jwt.sign({ userId: user.id, family }, config.jwt.refreshSecret, { expiresIn: '7d' });

    // Store refresh token
    db.refreshTokens.push({
      id: uuidv4(),
      tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      userId: user.id,
      family,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    user.lastLoginAt = new Date().toISOString();

    // Audit log
    db.auditLogs.push({
      id: uuidv4(),
      userId: user.id,
      action: 'USER_LOGIN',
      entityName: 'User',
      entityId: user.id,
      previousStateJson: null,
      newStateJson: { email: user.email, role: user.role },
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'Browser',
      createdAt: new Date().toISOString()
    });

    db.save();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId
      }
    };
  }

  public static async refreshSession(tokenStr: string) {
    if (!tokenStr) {
      throw new Error('Refresh token is required');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tokenStr, config.jwt.refreshSecret);
    } catch (e: any) {
      throw new Error('Invalid or expired refresh token');
    }

    const stored = db.refreshTokens.find(rt => rt.tokenHash === crypto.createHash('sha256').update(tokenStr).digest('hex'));
    if (!stored || stored.isRevoked) {
      // Possible reuse attack: revoke entire token family
      if (stored) {
        db.refreshTokens.filter(rt => rt.family === stored.family).forEach(rt => rt.isRevoked = true);
        db.save();
      }
      throw new Error('Refresh token has been revoked or reused');
    }

    // Revoke old token
    stored.isRevoked = true;

    const user = db.users.find(u => u.id === decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('User no longer exists or is deactivated');
    }

    const employee = db.employees.find(e => e.userId === user.id);
    const employeeId = employee ? employee.employeeId : user.employeeId;

    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId
    };

    const newAccessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.id, family: stored.family, jti: uuidv4() }, config.jwt.refreshSecret, { expiresIn: '7d' });

    db.refreshTokens.push({
      id: uuidv4(),
      tokenHash: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
      userId: user.id,
      family: stored.family,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    db.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: payload
    };
  }

  public static async logout(userId: string, tokenStr?: string) {
    if (tokenStr) {
      const stored = db.refreshTokens.find(rt => rt.tokenHash === crypto.createHash('sha256').update(tokenStr).digest('hex'));
      if (stored && stored.userId === userId) {
        stored.isRevoked = true;
      }
    } else {
      // Revoke all active tokens for this user
      db.refreshTokens.filter(rt => rt.userId === userId).forEach(rt => rt.isRevoked = true);
    }
    db.save();
    return { success: true, message: 'Logged out successfully' };
  }
}
