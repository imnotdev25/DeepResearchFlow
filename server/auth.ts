import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, type User, type InsertUser } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

// Simple encryption for API keys
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(userData: { 
  email: string; 
  username: string; 
  password: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}): Promise<User> {
  const passwordHash = await hashPassword(userData.password);
  
  const insertData: InsertUser = {
    email: userData.email,
    username: userData.username,
    passwordHash,
    openaiApiKey: userData.openaiApiKey ? encrypt(userData.openaiApiKey) : null,
    openaiBaseUrl: userData.openaiBaseUrl || "https://api.openai.com/v1",
  };
  
  const [user] = await db.insert(users).values(insertData).returning();
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function updateUserApiKey(userId: number, apiKey: string, baseUrl?: string): Promise<void> {
  await db.update(users)
    .set({ 
      openaiApiKey: encrypt(apiKey),
      openaiBaseUrl: baseUrl || "https://api.openai.com/v1",
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}

export async function getUserApiKey(userId: number): Promise<{ apiKey: string; baseUrl: string } | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.openaiApiKey) return null;
  
  return {
    apiKey: decrypt(user.openaiApiKey),
    baseUrl: user.openaiBaseUrl || "https://api.openai.com/v1"
  };
}

export function requireAuth(req: Request & { userId?: number }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.userId = decoded.userId;
  next();
}

export function optionalAuth(req: Request & { userId?: number }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.userId = decoded.userId;
    }
  }
  
  next(); // Continue regardless of authentication status
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}