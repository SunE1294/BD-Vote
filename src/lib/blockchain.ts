import { ethers } from 'ethers';
import { BDVoteABI } from './contract-abi';

const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS as string) ?? '';
const RPC_URL          = (import.meta.env.VITE_RPC_URL          as string) ?? 'https://rpc-amoy.polygon.technology';
const CHAIN_ID         = parseInt((import.meta.env.VITE_CHAIN_ID as string) ?? '80002', 10);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CandidateResult {
  id:        number;
  name:      string;
  party:     string;
  symbol:    string;
  voteCount: number;
}

export interface ElectionStatus {
  isOngoing:  boolean;
  hasEnded:   boolean;
  hasStarted: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, BDVoteABI, signerOrProvider ?? getProvider());
}

/** Returns false when VITE_CONTRACT_ADDRESS is not set — callers fall back to mock data. */
export function isBlockchainConfigured(): boolean {
  return CONTRACT_ADDRESS.startsWith('0x') && CONTRACT_ADDRESS.length === 42;
}

// ─── Write ───────────────────────────────────────────────────────────────────

/**
 * Submit a vote transaction to the contract.
 * @param candidateId  1-based candidate index (matches order in deploy script).
 * @param privateKey   Voter's deterministic private key (from generateWalletFromVoterId).
 * @returns            Transaction hash of the mined transaction.
 */
export async function castVoteOnChain(candidateId: number, privateKey: string): Promise<string> {
  const provider = getProvider();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    throw new Error(`Wrong network. Expected chainId ${CHAIN_ID}, got ${network.chainId}.`);
  }

  const signer   = new ethers.Wallet(privateKey, provider);
  const contract = getContract(signer);

  const tx      = await (contract.castVote as (id: number) => Promise<ethers.TransactionResponse>)(candidateId);
  const receipt = await tx.wait();

  if (!receipt) throw new Error('Transaction receipt is null');
  return receipt.hash;
}

// ─── Read ────────────────────────────────────────────────────────────────────

/** Fetch all candidates with their live vote counts from the contract. */
export async function getAllCandidates(): Promise<CandidateResult[]> {
  const contract = getContract();
  const raw = await (contract.getAllCandidates as () => Promise<
    Array<{ id: bigint; name: string; party: string; symbol: string; voteCount: bigint }>
  >)();

  return raw.map((c) => ({
    id:        Number(c.id),
    name:      c.name,
    party:     c.party,
    symbol:    c.symbol,
    voteCount: Number(c.voteCount),
  }));
}

/** Check whether a wallet address has already voted. */
export async function checkVoted(address: string): Promise<boolean> {
  const contract = getContract();
  return (contract.checkVoted as (addr: string) => Promise<boolean>)(address);
}

/** Return the sum of all votes cast so far. */
export async function getTotalVotes(): Promise<number> {
  const contract = getContract();
  const total = await (contract.getTotalVotes as () => Promise<bigint>)();
  return Number(total);
}

/** Return the current election window status. */
export async function getElectionStatus(): Promise<ElectionStatus> {
  const contract = getContract();
  const [isOngoing, hasEnded, hasStarted] = await (
    contract.getElectionStatus as () => Promise<[boolean, boolean, boolean]>
  )();
  return { isOngoing, hasEnded, hasStarted };
}
