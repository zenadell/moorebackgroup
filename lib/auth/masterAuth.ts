import { NextRequest } from 'next/server';
import { validateSession, verifyMasterPassword } from '@/lib/auth/serverStore';

export interface MasterAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
  sessionId?: string;
  token?: string;
}

export async function authorizeMasterRequest(
  req: NextRequest,
  forbiddenMessage = 'Only Declan Salo may access this administrative resource.'
): Promise<MasterAuthResult> {
  const saloKey = req.headers.get('x-salo-key');
  if (saloKey && (await verifyMasterPassword(saloKey))) {
    return { ok: true, status: 200, userId: 'usr_declan_salo' };
  }

  // Prioritize dedicated admin cookie/header before shared user session cookie
  const candidateTokens = [
    req.cookies.get('salo_master_token')?.value,
    req.headers.get('x-master-token'),
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, ''),
    req.headers.get('x-session-token'),
    req.cookies.get('moback_session_token')?.value,
  ].filter((t): t is string => Boolean(t && t.trim()));

  if (candidateTokens.length === 0) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  let sawNonMaster = false;
  for (const token of candidateTokens) {
    const sessionRes = await validateSession(token);
    if (sessionRes.valid && sessionRes.session) {
      if (sessionRes.session.isMaster) {
        return {
          ok: true,
          status: 200,
          userId: sessionRes.session.userId,
          sessionId: sessionRes.session.id,
          token,
        };
      }
      sawNonMaster = true;
    }
  }

  return {
    ok: false,
    status: sawNonMaster ? 403 : 401,
    error: sawNonMaster ? forbiddenMessage : 'Session expired or unauthorized',
  };
}
