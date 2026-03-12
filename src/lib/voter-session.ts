/**
 * Lightweight session store for the authenticated voter.
 * Uses sessionStorage so data is cleared when the tab/browser is closed.
 */

import { generateWalletFromVoterId } from './wallet';

const SESSION_KEY = 'bdvote_voter_session';

export interface VoterSession {
  voterId:       string;
  name:          string;
  walletAddress: string;
  privateKey:    string;
}

/** Persist a voter session after successful biometric verification. */
export function saveVoterSession(voterId: string, name: string): VoterSession {
  const { address, privateKey } = generateWalletFromVoterId(voterId);
  const session: VoterSession = { voterId, name, walletAddress: address, privateKey };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** Retrieve the current voter session, or null if not set. */
export function getVoterSession(): VoterSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VoterSession;
  } catch {
    return null;
  }
}

/** Clear the session on logout. */
export function clearVoterSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
