import { ethers } from 'ethers';

/**
 * Generate a deterministic wallet address from student ID
 * This ensures the same student ID always generates the same wallet
 */
export function generateWalletFromVoterId(voterId: string): {
  address: string;
  privateKey: string;
} {
  // Create a deterministic seed from the student ID
  // Using a fixed salt for consistency
  const salt = 'univote-voting-system-2024';
  const seed = ethers.keccak256(ethers.toUtf8Bytes(`${salt}:${voterId}`));
  
  // Create wallet from the seed
  const wallet = new ethers.Wallet(seed);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}
