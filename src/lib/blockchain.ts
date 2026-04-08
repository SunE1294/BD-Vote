import { ethers } from 'ethers';

/**
 * BDVote Secure Smart Contract — Frontend Integration
 * 
 * Architecture: Blockchain is the PRIMARY authority on votes.
 *               Supabase DB is a read-cache for fast UI queries.
 *               No simulated fallback — if blockchain fails, vote fails honestly.
 */

// BDVote Smart Contract ABI (Base Sepolia Testnet)
export const BD_VOTE_ABI = [
  "function castVote(bytes32 voterIdHash, bytes32 candidateHash) external returns (bytes32 receiptHash)",
  "function checkHasVoted(bytes32 voterIdHash) external view returns (bool)",
  "function getVoteCount() external view returns (uint256)",
  "function getCandidateVotes(bytes32 candidateHash) external view returns (uint256)",
  "function getResults(bytes32[] calldata candidateHashes) external view returns (uint256[])",
  "function verifyReceipt(bytes32 receipt) external view returns (bool)",
  "function getVote(uint256 index) external view returns (bytes32 voterIdHash, bytes32 candidateHash, uint256 timestamp, bytes32 receiptHash, address submittedBy)",
  "function isElectionActive() external view returns (bool)",
  "function totalVotes() external view returns (uint256)",
  "event VoteCast(bytes32 indexed voterIdHash, bytes32 indexed candidateHash, bytes32 receiptHash, uint256 timestamp, uint256 voteIndex)"
];

// Contract address on Base Sepolia — UPDATE after Remix deployment
export const BD_VOTE_CONTRACT_ADDRESS = import.meta.env.VITE_BD_VOTE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Base Sepolia RPC (chainId 84532)
export const SEPOLIA_RPC_URL = "https://sepolia.base.org";

// Consistent salt used across frontend and edge function
const HASH_SALT = 'bdvote-election-system-2026';

/**
 * Check if real blockchain is configured
 */
export function isBlockchainConfigured(): boolean {
  return BD_VOTE_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

/**
 * Generate a keccak256 hash of the voter ID for privacy
 * Must match the edge function's hashing logic
 */
export function hashVoterId(voterId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:${voterId}`));
}

/**
 * Generate a keccak256 hash of the candidate ID
 * Must match the edge function's hashing logic
 */
export function hashCandidateId(candidateId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:candidate:${candidateId}`));
}

/**
 * Check if a voter has already voted on-chain (FR-12)
 * This is the AUTHORITATIVE check — DB check is secondary
 */
export async function checkVotedOnChain(voterId: string): Promise<boolean> {
  if (!isBlockchainConfigured()) return false;
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    const voterIdHash = hashVoterId(voterId);
    return await contract.checkHasVoted(voterIdHash);
  } catch {
    console.error('Failed to check on-chain vote status');
    return false;
  }
}

/**
 * Get total vote count from blockchain
 */
export async function getOnChainVoteCount(): Promise<number> {
  if (!isBlockchainConfigured()) return 0;
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    const count = await contract.getVoteCount();
    return Number(count);
  } catch {
    console.error('Failed to get on-chain vote count');
    return 0;
  }
}

/**
 * Get vote count for a specific candidate from blockchain
 */
export async function getOnChainCandidateVotes(candidateId: string): Promise<number> {
  if (!isBlockchainConfigured()) return 0;
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    const candidateHash = hashCandidateId(candidateId);
    const count = await contract.getCandidateVotes(candidateHash);
    return Number(count);
  } catch {
    console.error('Failed to get on-chain candidate votes');
    return 0;
  }
}

/**
 * Batch get results for multiple candidates from blockchain
 * Returns an array of { candidateId, votes } objects
 */
export async function getBlockchainResults(
  candidateIds: string[]
): Promise<{ candidateId: string; votes: number }[]> {
  if (!isBlockchainConfigured() || candidateIds.length === 0) {
    return candidateIds.map(id => ({ candidateId: id, votes: 0 }));
  }
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    const candidateHashes = candidateIds.map(id => hashCandidateId(id));
    const voteCounts = await contract.getResults(candidateHashes);
    return candidateIds.map((id, i) => ({
      candidateId: id,
      votes: Number(voteCounts[i]),
    }));
  } catch {
    console.error('Failed to get blockchain results');
    return candidateIds.map(id => ({ candidateId: id, votes: 0 }));
  }
}

/**
 * Verify a voter's receipt on-chain
 * Returns true if the receipt exists and is valid
 */
export async function verifyVoteReceipt(receiptHash: string): Promise<boolean> {
  if (!isBlockchainConfigured()) return false;
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    return await contract.verifyReceipt(receiptHash);
  } catch {
    console.error('Failed to verify receipt on-chain');
    return false;
  }
}

/**
 * Get vote details from blockchain by index
 */
export async function getOnChainVote(index: number): Promise<{
  voterIdHash: string;
  candidateHash: string;
  timestamp: number;
  receiptHash: string;
  submittedBy: string;
} | null> {
  if (!isBlockchainConfigured()) return null;
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    const [voterIdHash, candidateHash, timestamp, receiptHash, submittedBy] = await contract.getVote(index);
    return {
      voterIdHash,
      candidateHash,
      timestamp: Number(timestamp),
      receiptHash,
      submittedBy,
    };
  } catch {
    return null;
  }
}

/**
 * Check if election is active on-chain
 */
export async function isElectionActive(): Promise<boolean> {
  if (!isBlockchainConfigured()) return true;
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    return await contract.isElectionActive();
  } catch {
    return true;
  }
}

/**
 * Verify a transaction hash on Base Sepolia
 */
export async function verifyTransaction(txHash: string): Promise<{
  confirmed: boolean;
  blockNumber: number | null;
  timestamp: number | null;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { confirmed: false, blockNumber: null, timestamp: null };
    }
    const block = await provider.getBlock(receipt.blockNumber);
    return {
      confirmed: receipt.status === 1,
      blockNumber: receipt.blockNumber,
      timestamp: block?.timestamp ?? null,
    };
  } catch {
    return { confirmed: false, blockNumber: null, timestamp: null };
  }
}

/**
 * Format a transaction hash for display (shortened)
 */
export function formatTxHash(txHash: string): string {
  if (!txHash || txHash.length < 10) return txHash;
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
}

/**
 * Get Base Sepolia explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Validate if a string is a valid bytes32 hash
 */
export function isValidBytes32(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
