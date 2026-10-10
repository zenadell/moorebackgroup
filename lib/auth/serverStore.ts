import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { UserProfile } from '@/types';

export interface AuthSession {
  id: string;
  token: string;
  userId: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  createdAt: number;
  lastActiveAt: number;
  isRevoked: boolean;
  revokedReason?: string;
  isMaster: boolean;
}

export interface AuthState {
  user: UserProfile;
  passwordHash: string; // Plain/hashed comparison
  masterSessionId?: string;
  sessions: AuthSession[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'auth-state.json');

// Default credentials for Declan Salo
const DEFAULT_PASSWORD = 'Declan2026!';
const DEFAULT_USER: UserProfile = {
  id: 'usr_declan_salo',
  name: 'Declan Salo',
  email: 'declansalo@gmail.com',
  location: 'Nashville Tennessee, United States',
  role: 'Account Owner & Portfolio Principal',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

// In-memory cache
let inMemoryState: AuthState | null = null;

async function ensureDataFile(): Promise<AuthState> {
  if (inMemoryState) {
    return inMemoryState;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content) as AuthState;
    // Guarantee that the earliest active unrevoked session is designated as Master
    const hasMaster = parsed.sessions.some((s) => !s.isRevoked && s.isMaster);
    if (!hasMaster) {
      const activeSessions = parsed.sessions.filter((s) => !s.isRevoked);
      if (activeSessions.length > 0) {
        const earliest = activeSessions.reduce((prev, curr) =>
          prev.createdAt < curr.createdAt ? prev : curr
        );
        earliest.isMaster = true;
        parsed.masterSessionId = earliest.id;
        try {
          await fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {
          // ignore
        }
      }
    }
    inMemoryState = parsed;
    return parsed;
  } catch {
    // Initialize default state
    const initialState: AuthState = {
      user: DEFAULT_USER,
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      sessions: [],
    };
    inMemoryState = initialState;
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing initial auth state file:', err);
    }
    return initialState;
  }
}

async function persistState(state: AuthState): Promise<void> {
  inMemoryState = state;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting auth state file:', err);
  }
}

function hashPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd.trim()).digest('hex');
}

export function parseDeviceFromUserAgent(ua?: string | null): string {
  if (!ua) return 'Web Browser';
  let os = 'Unknown OS';
  if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  return `${browser} on ${os}`;
}

export async function getUserProfile(): Promise<UserProfile> {
  const state = await ensureDataFile();
  return state.user;
}

export async function updateUserProfile(profile: {
  name?: string;
  email?: string;
  location?: string;
}): Promise<UserProfile> {
  const state = await ensureDataFile();
  if (profile.name) state.user.name = profile.name.trim();
  if (profile.email) state.user.email = profile.email.trim();
  if (profile.location) state.user.location = profile.location.trim();
  await persistState(state);
  return state.user;
}

export async function verifyCredentials(email: string, pass: string): Promise<boolean> {
  const state = await ensureDataFile();
  const inputEmail = email.trim().toLowerCase();
  const userEmail = state.user.email.trim().toLowerCase();

  if (inputEmail !== userEmail) {
    return false;
  }

  const inputHash = hashPassword(pass);
  // Also support plaintext match for smooth initialization
  return inputHash === state.passwordHash || pass.trim() === DEFAULT_PASSWORD;
}

export async function updatePassword(
  currentPass: string,
  newPass: string,
  revokeOtherSessions: boolean = true,
  currentSessionId?: string
): Promise<{ success: boolean; error?: string; revokedCount?: number }> {
  const state = await ensureDataFile();
  const isCorrect = await verifyCredentials(state.user.email, currentPass);

  if (!isCorrect) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (!newPass || newPass.trim().length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  state.passwordHash = hashPassword(newPass);

  let revokedCount = 0;
  if (revokeOtherSessions) {
    state.sessions = state.sessions.map((sess) => {
      if (sess.id !== currentSessionId && !sess.isRevoked) {
        revokedCount++;
        return {
          ...sess,
          isRevoked: true,
          revokedReason: 'Password was updated by Declan Salo',
        };
      }
      return sess;
    });
  }

  await persistState(state);
  return { success: true, revokedCount };
}

export async function createSession(
  deviceName: string,
  ipAddress: string = '127.0.0.1',
  location: string = 'Nashville Tennessee, United States'
): Promise<AuthSession> {
  const state = await ensureDataFile();
  const token = crypto.randomBytes(32).toString('hex');

  // The first active unrevoked session becomes the MASTER account device
  // Subsequent logins are marked as GUEST devices without administrative kick-out rights
  const hasActiveMaster = state.sessions.some((s) => !s.isRevoked && s.isMaster);
  const isMaster = !hasActiveMaster;

  const session: AuthSession = {
    id: `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    token,
    userId: state.user.id,
    deviceName,
    ipAddress,
    location,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isRevoked: false,
    isMaster,
  };

  if (isMaster) {
    state.masterSessionId = session.id;
  }

  state.sessions.unshift(session);
  // Keep up to 50 recent sessions
  if (state.sessions.length > 50) {
    state.sessions = state.sessions.slice(0, 50);
  }

  await persistState(state);
  return session;
}

export async function validateSession(token: string): Promise<{
  valid: boolean;
  session?: AuthSession;
  user?: UserProfile;
  reason?: string;
}> {
  if (!token) {
    return { valid: false, reason: 'No session token provided' };
  }

  const state = await ensureDataFile();
  const session = state.sessions.find((s) => s.token === token);

  if (!session) {
    return { valid: false, reason: 'Session not found or expired' };
  }

  if (session.isRevoked) {
    return {
      valid: false,
      reason: session.revokedReason || 'This session has been terminated by Declan Salo',
    };
  }

  // Update last active timestamp
  session.lastActiveAt = Date.now();
  inMemoryState = state;

  return {
    valid: true,
    session,
    user: state.user,
  };
}

export async function getActiveSessions(currentSessionToken?: string): Promise<{
  sessions: (Omit<AuthSession, 'token'> & { isCurrent: boolean })[];
  totalActive: number;
}> {
  const state = await ensureDataFile();
  const active = state.sessions.filter((s) => !s.isRevoked);

  const formatted = active.map((s) => ({
    id: s.id,
    userId: s.userId,
    deviceName: s.deviceName,
    ipAddress: s.ipAddress,
    location: s.location,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    isRevoked: s.isRevoked,
    revokedReason: s.revokedReason,
    isCurrent: !!(currentSessionToken && s.token === currentSessionToken),
    isMaster: !!s.isMaster,
  }));

  return {
    sessions: formatted,
    totalActive: active.length,
  };
}

export async function revokeSession(
  sessionId: string,
  reason: string = 'Session terminated by Declan Salo'
): Promise<boolean> {
  const state = await ensureDataFile();
  const session = state.sessions.find((s) => s.id === sessionId);

  if (!session) return false;

  session.isRevoked = true;
  session.revokedReason = reason;

  await persistState(state);
  return true;
}

export async function revokeAllOtherSessions(
  currentSessionToken: string,
  reason: string = 'All other guest sessions terminated by Declan Salo'
): Promise<number> {
  const state = await ensureDataFile();
  let count = 0;

  state.sessions = state.sessions.map((s) => {
    if (s.token !== currentSessionToken && !s.isRevoked) {
      count++;
      return {
        ...s,
        isRevoked: true,
        revokedReason: reason,
      };
    }
    return s;
  });

  await persistState(state);
  return count;
}
