import { ethers } from 'ethers';

/**
 * BDVote Secure Smart Contract — Frontend Integration
 * 
 * Architecture: Blockchain is the PRIMARY authority on votes.
 *               Supabase DB is a read-cache for fast UI queries.
 *               No simulated fallback — if blockchain fails, vote fails honestly.
 */

// BDVote Smart Contract ABI
export const BD_VOTE_ABI = [
  "function castVote(bytes32 voterIdHash, bytes32 candidateHash, string candidateName) external returns (bytes32 receiptHash)",
  "function checkHasVoted(bytes32 voterIdHash) external view returns (bool)",
  "function getVoteCount() external view returns (uint256)",
  "function getCandidateVotes(bytes32 candidateHash) external view returns (uint256)",
  "function getResults(bytes32[] calldata candidateHashes) external view returns (uint256[])",
  "function verifyReceipt(bytes32 receipt) external view returns (bool)",
  "function getVote(uint256 index) external view returns (bytes32 voterIdHash, bytes32 candidateHash, string candidateName, uint256 timestamp, bytes32 receiptHash, address submittedBy)",
  "function isElectionActive() external view returns (bool)",
  "function totalVotes() external view returns (uint256)",
  "event VoteCast(bytes32 indexed voterIdHash, bytes32 indexed candidateHash, string candidateName, bytes32 receiptHash, uint256 timestamp, uint256 voteIndex)"
];

// Contract address on Base Sepolia — hardcoded fallback matches deployed contract
export const BD_VOTE_CONTRACT_ADDRESS =
  import.meta.env.VITE_BD_VOTE_CONTRACT_ADDRESS ||
  "0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9";

// Hash salt — must match edge function
export const HASH_SALT = "fallback-secure-salt-2026";

// Base Sepolia RPC (chainId 84532)
export const SEPOLIA_RPC_URL = "https://sepolia.base.org";

/**
 * Check if real blockchain is configured
 */
export function isBlockchainConfigured(): boolean {
  return BD_VOTE_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

/**
 * Get on-chain vote counts for multiple candidates in one batch call
 * @param candidates Array of { id, full_name }
 * @returns Array of { id, full_name, onChainVotes }
 */
export async function getOnChainCandidateVotes(
  candidates: { id: string; full_name: string }[]
): Promise<{ id: string; full_name: string; onChainVotes: number }[]> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);

    const hashes = candidates.map(c =>
      ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:candidate:${c.id}`))
    );

    const counts: bigint[] = await contract.getResults(hashes);

    return candidates.map((c, i) => ({
      id: c.id,
      full_name: c.full_name,
      onChainVotes: Number(counts[i] ?? 0),
    }));
  } catch (err) {
    console.error('Failed to get on-chain candidate votes:', err);
    return candidates.map(c => ({ id: c.id, full_name: c.full_name, onChainVotes: 0 }));
  }
}

/**
 * Get all votes from blockchain (returns array of vote records)
 */
export async function getAllOnChainVotes(): Promise<{
  index: number;
  voterIdHash: string;
  candidateName: string;
  timestamp: number;
  txHash: string;
}[]> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(BD_VOTE_CONTRACT_ADDRESS, BD_VOTE_ABI, provider);
    const total = Number(await contract.totalVotes());
    const votes = [];
    for (let i = 0; i < total; i++) {
      try {
        const [voterIdHash, , candidateName, timestamp, receiptHash] = await contract.getVote(i);
        votes.push({
          index: i,
          voterIdHash,
          candidateName,
          timestamp: Number(timestamp),
          txHash: receiptHash,
        });
      } catch {
        // skip bad index
      }
    }
    return votes;
  } catch (err) {
    console.error('Failed to get all on-chain votes:', err);
    return [];
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
