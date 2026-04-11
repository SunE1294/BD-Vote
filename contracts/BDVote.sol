// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BDVote — Secure Bangladesh Digital Voting Smart Contract
 * @notice Blockchain-first architecture: this contract is the SOLE authority on votes.
 *         Database (Supabase) is a read-cache only.
 *
 * Security guarantees:
 *   - hasVoted mapping: once true, can NEVER be set back to false
 *   - candidateVotes mapping: only increments, never decrements
 *   - votes array: append-only, records can never be deleted or modified
 *   - Election can be ended but NEVER restarted (prevents admin manipulation)
 *   - Every vote generates a unique receipt for voter verification
 *
 * @dev Deploy on Base Sepolia testnet via Remix IDE + MetaMask
 *
 * HOW TO DEPLOY (Remix IDE):
 * 1. Go to https://remix.ethereum.org
 * 2. Create new file "BDVote.sol" and paste this code
 * 3. Compile with Solidity 0.8.24+
 * 4. Deploy → Environment: "Injected Provider - MetaMask"
 * 5. Select Base Sepolia network in MetaMask
 * 6. Click "Deploy" and confirm in MetaMask
 * 7. Copy the deployed contract address → update .env
 */
contract BDVote {
    // ===== State Variables =====
    address public admin;
    bool public electionActive;
    uint256 public totalVotes;

    struct Vote {
        bytes32 voterIdHash;     // keccak256 hash of voter ID (privacy preserved)
        bytes32 candidateHash;   // keccak256 hash of candidate ID
        string  candidateName;   // human-readable candidate name (visible on BaseScan)
        uint256 timestamp;       // block timestamp
        bytes32 receiptHash;     // unique receipt for voter verification
        address submittedBy;     // relayer wallet that submitted
    }

    // All votes stored sequentially (append-only, never deleted)
    Vote[] public votes;

    // Track which voter hashes have already voted (once true, FOREVER true)
    mapping(bytes32 => bool) public hasVoted;

    // Track vote counts per candidate hash (only increments, never decrements)
    mapping(bytes32 => uint256) public candidateVotes;

    // Receipt verification — voter can verify their vote exists
    mapping(bytes32 => bool) public receiptExists;

    // ===== Events =====
    event VoteCast(
        bytes32 indexed voterIdHash,
        bytes32 indexed candidateHash,
        string  candidateName,
        bytes32 receiptHash,
        uint256 timestamp,
        uint256 voteIndex
    );
    event ElectionStarted(uint256 timestamp);
    event ElectionEnded(uint256 timestamp);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    // ===== Modifiers =====
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    modifier electionIsActive() {
        require(electionActive, "Election is not active");
        _;
    }

    // ===== Constructor =====
    constructor() {
        admin = msg.sender;
        electionActive = true;
        emit ElectionStarted(block.timestamp);
    }

    // ===== Core Functions =====

    /**
     * @notice Cast a vote — creates an IMMUTABLE record on-chain
     * @param voterIdHash  keccak256 hash of the voter's NID (privacy preserved)
     * @param candidateHash keccak256 hash of the candidate ID
     * @return receiptHash  unique receipt the voter can use to verify their vote
     */
    function castVote(
        bytes32 voterIdHash,
        bytes32 candidateHash,
        string calldata candidateName
    ) external electionIsActive returns (bytes32 receiptHash) {
        // FR-12: One Vote Restriction — once voted, can NEVER vote again
        require(!hasVoted[voterIdHash], "This voter has already voted");
        require(voterIdHash != bytes32(0), "Invalid voter ID hash");
        require(candidateHash != bytes32(0), "Invalid candidate hash");

        // Generate unique receipt
        receiptHash = keccak256(abi.encodePacked(
            voterIdHash, candidateHash, block.timestamp, totalVotes
        ));

        // IMMUTABLE: once true, forever true
        hasVoted[voterIdHash] = true;

        // IMMUTABLE: only increments, never decrements
        candidateVotes[candidateHash] += 1;
        totalVotes += 1;

        // IMMUTABLE: append-only array, records can never be deleted
        votes.push(Vote({
            voterIdHash: voterIdHash,
            candidateHash: candidateHash,
            candidateName: candidateName,
            timestamp: block.timestamp,
            receiptHash: receiptHash,
            submittedBy: msg.sender
        }));

        // Mark receipt as valid
        receiptExists[receiptHash] = true;

        emit VoteCast(voterIdHash, candidateHash, candidateName, receiptHash, block.timestamp, totalVotes - 1);

        return receiptHash;
    }

    // ===== Read Functions =====

    /**
     * @notice Get total number of votes cast
     */
    function getVoteCount() external view returns (uint256) {
        return totalVotes;
    }

    /**
     * @notice Get vote count for a specific candidate
     */
    function getCandidateVotes(bytes32 candidateHash) external view returns (uint256) {
        return candidateVotes[candidateHash];
    }

    /**
     * @notice Batch get results for multiple candidates in one call
     * @param candidateHashes Array of candidate hashes
     * @return voteCounts Array of vote counts (same order as input)
     */
    function getResults(bytes32[] calldata candidateHashes)
        external view returns (uint256[] memory voteCounts)
    {
        voteCounts = new uint256[](candidateHashes.length);
        for (uint256 i = 0; i < candidateHashes.length; i++) {
            voteCounts[i] = candidateVotes[candidateHashes[i]];
        }
        return voteCounts;
    }

    /**
     * @notice Verify a voter's receipt on-chain
     * @param receipt The receipt hash given to the voter after voting
     * @return exists Whether the receipt is valid
     */
    function verifyReceipt(bytes32 receipt) external view returns (bool exists) {
        return receiptExists[receipt];
    }

    /**
     * @notice Check if a voter hash has already voted
     */
    function checkHasVoted(bytes32 voterIdHash) external view returns (bool) {
        return hasVoted[voterIdHash];
    }

    /**
     * @notice Get vote details by index
     */
    function getVote(uint256 index) external view returns (
        bytes32 voterIdHash,
        bytes32 candidateHash,
        string memory candidateName,
        uint256 timestamp,
        bytes32 receiptHash,
        address submittedBy
    ) {
        require(index < votes.length, "Vote index out of bounds");
        Vote storage v = votes[index];
        return (v.voterIdHash, v.candidateHash, v.candidateName, v.timestamp, v.receiptHash, v.submittedBy);
    }

    /**
     * @notice Check if election is active
     */
    function isElectionActive() external view returns (bool) {
        return electionActive;
    }

    // ===== Admin Functions =====

    /**
     * @notice End election — ONE-WAY, can NEVER be restarted
     * @dev This prevents admin from ending and restarting to allow duplicate votes
     */
    function endElection() external onlyAdmin {
        require(electionActive, "Election not active");
        electionActive = false;
        emit ElectionEnded(block.timestamp);
    }

    /**
     * @notice Transfer admin role
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
