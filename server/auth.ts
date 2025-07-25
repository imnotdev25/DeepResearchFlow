import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { db } from './db';
import { users, type User, type InsertUser } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
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

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
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

export function requireAuth(req: any, res: any, next: any) {
  console.log('RequireAuth check:', { 
    sessionExists: !!req.session, 
    userId: req.session?.userId,
    sessionId: req.session?.id 
  });
  
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Extend Express session interface
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}